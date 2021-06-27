//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const crypto=require("crypto");
const Razorpay=require("razorpay");
const cors=require("cors")
var cookieParser = require("cookie-parser");
var bcrypt = require("bcryptjs");
var fs = require("fs");
var path = require("path");
var multer = require("multer");
var request = require('request');

const mongoose = require("mongoose");

// const connectdb=async () => {
//   try {
//     await mongoose.connect("mongodb+srv://spider8019:spider8019pizzaboy@cluster0.7slke.mongodb.net/firstDb?retryWrites=true&w=majority",{useNewUrlParser:true,useCreateIndex:true,useUnifiedTopology: true,useFindAndModify: false})
//     console.log("Server connected successsfully")
//   } catch (err) {
//     console.log('error: ' + err)
//   }
// }
// connectdb()

 mongoose.connect("mongodb://localhost:27017/pizza-boy",{useNewUrlParser:true,useCreateIndex:true,useUnifiedTopology: true,useFindAndModify: false})

// razorpay instance
const instance=new Razorpay({
  key_id:process.env.RAZORPAY_KEY_ID,
  key_secret:process.env.RAZORPAY_KEY_SECRET
})


const cities=require("./public/js/cityarray")
var itemModel = require("./mongoose/itemModel");
var Users = require("./mongoose/lioModel");
var reviewModel = require("./mongoose/review");
var placedModel = require("./mongoose/orderPlaceModel");
var storeModel = require("./mongoose/stores");
var offersModel = require("./mongoose/offers");
var auth = require("./middleware/auth");
var { codeconfirm } = require("./accounts/otpconfimmail.js");
var { forgetpassword } = require("./accounts/forgetpasswordemail.js");
// const review = require("./mongoose/review");

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.set("view engine", "ejs");


app
  .route("/")
  .get(auth, async (req, res) => {
    // var items = await itemModel.find({});
    var stores=await storeModel.find({ "address": { "$regex": req.user.defaultCity, "$options": "i" } }).populate("itemsId");
    var totalStores= await storeModel.countDocuments()
    var userCount=await Users.countDocuments({})
    var offers=await offersModel.find({}).populate("itemId","itemImg name");
    // let most = items;
    // most.sort((a, b) =>
    //   a.orderCount > b.orderCount ? 1 : b.orderCount > a.orderCount ? -1 : 0
    // );
    // most.reverse();

    var avgRatings=[]
    for(var i=0;i<stores.length;i++){
      for(var j=0;j<stores[i].itemsId.length;j++){
        var totalRatingValue=0;
        var totalReviews=0;
        var ratings = await reviewModel.find({ itemid: stores[i].itemsId[j]._id,storeId:stores[i]._id });
        for(var k=0;k<ratings.length;k++){
         totalRatingValue+=ratings[k].stars;
         totalReviews+=1;
        }
        avgRatings.push({totalRatingValue,totalReviews});
        }
    }
    console.log(avgRatings)

 
    res.render("index", {  user:req.user,  avgRatings,stores,cities,offers,totalStores,userCount});
  })
app.route("/search")
  .get(auth, async (req, res) => {
    try {
      result = await storeModel.find({ "address": { "$regex": req.query.location, "$options": "i" } }).populate({path:"itemsId", match: { "description": { "$regex": req.query.item, "$options": "i" }  }});
      res.render("available", { availableItems: result,searchedLocation:req.query.location,searchedQuery:req.query.item });
    } catch (error) {
      res.render("404Error", { error });
    }
  });

app.post("/changeDefaultCity",auth,(async(req,res)=>{
  try{
    await Users.updateOne({_id:req.user._id},{defaultCity:req.body.defaultCity})
    res.redirect("/")
  }
  catch(error){
    res.render("404Error", { error });
  }
}))

app.get("/order/:orderItemId/:storeId", async (req, res) => {
  try {
    var result = await itemModel.findOne({ _id: req.params.orderItemId });
    var totalReviews=await reviewModel
    .find({ itemid: req.params.orderItemId })
    .countDocuments();
    var reviews = await reviewModel
      .find({ itemid: req.params.orderItemId })
      .sort({ date: -1 })
      .limit(2)
      .skip(0);
    var reviewUserNames = [];
    for (var i = 0; i < reviews.length; i++) {
      var reviewGiverName = await Users.findOne(
        { _id: reviews[i].userid },
        { name: 1, _id: 0 }
      );
      reviewUserNames.push(reviewGiverName);
    }
    
    var store=await storeModel.findOne({_id:req.params.storeId})
    res.render("order", { result, reviews, reviewUserNames,totalReviews,store });
  } catch (error) {
    res.render("404Error", { error });
  }
});
app.get("/reviews/:orderItemId/:skip/:limit",async(req,res)=>{
    try{
        // var result = await itemModel.findOne({ _id: req.params.orderItemId });
        var reviews = await reviewModel
          .find({ itemid: req.params.orderItemId })
          .sort({ date: -1 })
          .limit(Number(req.params.limit))
          .skip(Number(req.params.skip));
        var reviewUserNames = [];
        for (var i = 0; i < reviews.length; i++) {
          var reviewGiverName = await Users.findOne(
            { _id: reviews[i].userid },
            { name: 1, _id: 0 }
          );
          reviewUserNames.push(reviewGiverName);
        }
    
        res.send({ reviews,reviewUserNames });
    }catch(error){

        res.render("404Error", { error });
    }
})

// cart routes
app.get("/wishlist/:userid", auth, async (req, res) => {
  try {
    var userAccount = await Users.findOne({ _id: req.params.userid });
    var items = [];
    for (var i = 0; i < userAccount.addToCart.length; i++) {
      var x = await itemModel.findOne({
        _id: userAccount.addToCart[i].item,
      }).select("name size price itemImg");
      var y=await storeModel.findOne({
        _id: userAccount.addToCart[i].storeId,
      }).select({nameOfStore:1});
      var z={_id:x._id,storeId:y._id,name:x.name,size:x.size,price:x.price,itemImg:x.itemImg,nameOfStore:y.nameOfStore}
      items.push(z);
    }
    // console.log(items)
    res.render("yourcart", { userAccount, items });
  } catch (error) {
    res.render("404Error", { error });
  }
});
app.post("/addtocart", auth, async (req, res) => {
  try {
    var user = await Users.findOne({ _id: req.user._id });
    user.addToCart = user.addToCart.concat({
      item: req.body.id,
      quantity: req.body.quantities,
      storeId:req.body.storeId
    });
    await user.save();
    res.redirect("/wishlist/" + req.user.id);
  } catch (error) {
    res.render("404Error", { error });
  }
});
app.get("/removefromcart/:itemId/userid/:userid", auth, async (req, res) => {
  try {
    // console.log(req.params.itemId)
    var user = await Users.findOne({ _id: req.params.userid });
    var count = 0;
    user.addToCart = user.addToCart.filter((item) => {
      return item._id != req.params.itemId;
    });
    await user.save();
    res.redirect("/wishlist/" + req.params.userid);
  } catch (error) {
    res.render("404Error", { error });
  }
});
app.route("/placeorder").post(auth, async (req, res) => {
  try {
    var item = await itemModel.findOne({ _id: req.body.id });
    var storeSelected= await storeModel.findOne({_id:req.body.storeId}).select("name")
    var user = req.user;
    res.redirect(
      "/getdeliveryinfo/itemid/" +
        item._id+"./store/"+storeSelected._id+
        "./quantity/" +
        req.body.quantities 
    );
  } catch (error) {
    res.render("404Error", { error });
  }
});

app
  .route("/getdeliveryinfo/itemid/:itemid/store/:storeId/quantity/:quantity")
  .get(auth, async (req, res) => {
    try {
      var itemsparam = req.params.itemid.split(".");
      var quantities=req.params.quantity.split(".")
      var items = [];
      var totalAmt=0;
      for (var i = 0; i < itemsparam.length-1; i++) {
        var item = await itemModel.findOne({ _id: itemsparam[i] }).select("name size price");
        for(var j=0;j<quantities[i].split("$").length-1;j++){
          console.log(item.price[j])
          console.log(quantities[i].split("$")[j])
          totalAmt+=(item.price[j]*quantities[i].split("$")[j])
        }
        items.push(item);
      }

      var storesparam = req.params.storeId.split(".");
      var stores = [];
      for (var i = 0; i < storesparam.length-1; i++) {
        var store = await storeModel.findOne({ _id: storesparam[i] }).select("nameOfStore");
        stores.push(store);
      }
      res.render("placeOrder", {
        razorpaykeyid:process.env.RAZORPAY_KEY_ID,
        items,
        stores,
        quantities: req.params.quantity,
        storeId:req.params.storeId,
        username: req.user.name,
        usermail: req.user.email,
        totalAmt
      });
      //    res.json({})
    } catch (error) {
      res.render("404Error", { error });
    }
  });


app.post("/api/payment/order",(req,res)=>{
  const params={"amount":req.body.amount,"currency":req.body.currency,"receipt":req.body.receipt,"payment_capture":req.body.payment_capture}
  instance.orders
   .create(params)
   .then((data)=>{
       res.send({sub:data,status:"success"})
   })
   .catch((error)=>{
       res.send({sub:error,status:"failed"})
   })
})
app.post("/api/payment/verify",auth,async(req,res)=>{

  body=req.body.razorpay_order_id + "|"+req.body.razorpay_payment_id;
  var expectedSignature=crypto
  .createHmac("sha256",process.env.RAZORPAY_KEY_SECRET)
  .update(body.toString())
  .digest("hex");
  // console.log("Sig"+req.body.razorpay_signature);
  // console.log("sig"+expectedSignature);
  var response={status:"failure"}
  if(expectedSignature==req.body.razorpay_signature){
    response={status:"success"}
    /////////////////////add order to databases
    
      var address=req.body.flat+" "+req.body.landmark+" "+req.body.colony+" "+req.body.zone+" "+req.body.city;
      let withoutDup =req.body.storeId.split(".").slice(0,-1).filter((c, index) => {
        return req.body.storeId.split(".").slice(0,-1).indexOf(c) == index;
      });
      var x=req.body.storeId.split(".")
      var u= await Users.findOne({_id:req.user.id},{defaultAddress:{address}})
      var luser=req.user;
      console.log(u)
      if(!luser.defaultAddress.includes(address))
        { 
          luser.defaultAddress.push(address)
          await luser.save();
          // await Users.updateOne({ _id: req.user._id }, { $push: { defaultAddress: address } });
        }
      for(var i=0;i<withoutDup.length;i++){
         var obj={
           reciever:req.body.reciever,
           loginUserId:req.user._id,
           fulladdress:req.body.flat+" "+req.body.landmark+" "+req.body.colony+" "+req.body.zone+" "+req.body.city,
           storeId:withoutDup[i],
           email:req.body.email,
           contact:req.body.contactNumber,
           paymentMethod:req.body.paymentMethod,
           item:[],
           quantity:[],
           delivered:-1,
         }
         for(var j=0;j<x.length-1;j++){
           if(withoutDup[i]==x[j]){
             obj.item.push(req.body.item.split(".")[j])
             obj.quantity.push(req.body.quantities.split(".")[j])
           }
         }
        }
        console.log(req.body.totalAmt)
        await storeModel.findOneAndUpdate({_id:req.body.storeId.split(".")[0]},{$inc:{totalEarning:req.body.totalAmt,amountForThisMonth:req.body.totalAmt}})
        await placedModel.create(obj)
  }
  res.send(response)
})
//franchise client related stuffs
app
  .route("/franchise/:storeId")
  .get(auth,async(req,res)=>{
     const storeDetails= await storeModel.findOne({_id:req.params.storeId}).populate("itemsId")
     const reviewsForThisStore=await reviewModel.find({storeId:req.params.storeId}).select("stars")
     res.render("particularStore",{storeDetails,reviewsForThisStore})
  })
app
  .route("/franchise/editStore/:storeId")
  .get(async(req,res)=>{
    try{
      const storeDetails= await storeModel.findOne({_id:req.params.storeId}).populate("itemsId")
      const items= await itemModel.find({})
      res.render("admin/editStore",{storeDetails,items})
    }
    catch(error){
      res.render("404Error", { error }); 
    }
  })
  .post(async(req,res)=>{
    try{
      const storeDetails= await storeModel.findOne({_id:req.params.storeId})
      if(storeDetails){
        storeDetails.name=req.body.name,
        storeDetails.description=req.body.description,
        storeDetails.owner=req.body.owner,
        storeDetails.address=req.body.address+"%"+req.body.zone+"%"+req.body.city+"%"+req.body.pincode+"%"+req.body.state,
        storeDetails.itemsId=req.body.itemsId
        await storeDetails.save()
        res.redirect("/adminwork")
      }
      res.render("404Error",{error:"No store is found"})
    }catch(error){
      res.render("404Error", { error }); 
    }
  })
// after giving address for delivery

// login logout signup  routes
app
  .route("/signup")
  .get(function (req, res) {
    res.render("signup");
  })
  .post(async (req, res) => {
    try {
      const obj = new Users({
        name: req.body.userName,
        email: req.body.email,
        password: req.body.password,
      });

      const token = await obj.generateAuthToken();
      // console.log(token)

      res.cookie("jwt", token, {
        expires: new Date(Date.now() + 600000000),
        httpOnly: true,
      });

      const userprofile = await obj.save();

      res.redirect("/");
    } catch (error) {
      res.render("404Error", { error });
    }
  });
app.route("/checkforavailmail").post(async (req, res) => {
  try {
    if (
      req.body.email.match(
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
      )
    ) {
      var x = await Users.findOne({ email: req.body.email });
      if (x) res.send("This email is already in use");
      else res.send("Available");
    } else res.send("Give proper email");
  } catch (error) {
    res.render("404Error", { error });
  }
});
app
  .route("/login")
  .get(async (req, res) => {
    try {
      // res.send("aman pratap singh")
      res.render("login");
    } catch (error) {
      res.send(`there is an error ${error}`);
    }
  })
  .post(async (req, res) => {
    try {
      var user = await Users.findOne({
        email: req.body.emailLogin,
      });
      var isMatch = await bcrypt.compare(req.body.passwordLogin, user.password);
      if (isMatch) {
        var token = await user.generateAuthToken();
        console.log(token)
        // res.send(token)
        res.cookie("jwt", token, {
          expires: new Date(Date.now() + 6000000000),
          httpOnly: true,
        });
        console.log(req.cookies)

        res.redirect("/");
      }
    } catch (e) {
      res.status(400).send(`user is not find ${e}`);
    }
  });
app.get("/logout", auth, async function (req, res) {
  res.clearCookie("jwt");
  req.user.tokens = [];
  req.user.save();
  res.redirect("/login");
});
app
  .route("/forgetpassword")
  .get(async (req, res) => {
    try {
      res.render("forgetpassword");
    } catch (error) {
      res.render("404Error", { error });
    }
  })
  .post(async (req, res) => {
    try {
      var userwithMail = await Users.findOne({ email: req.body.email });
      if (userwithMail) {
        forgetpassword(req.body.email);
        res.send("&#x2713; Sent successfully! Please check your email.");
      } else res.send("Sorry we have no acccount with given credentials !");
    } catch (error) {
      res.render("404Error", { error });
    }
  });
app.route("/resetpassword/:email").get(async (req, res) => {
  try {
    res.render("resetpassword", { email: req.params.email });
  } catch (error) {
    res.render("404Error", { error });
  }
});

app.route("/resetpasswordaccount").post(async (req, res) => {
  try {
    await Users.updateOne(
      { email: req.body.email },
      { password: req.body.resetpassone }
    );
    res.redirect("/login");
  } catch (error) {
    res.render("404Error", { error });
  }
});

////profile section
app.get("/profile", auth, async (req, res) => {
  try {
    var yourOrders = await placedModel
      .find({ loginUserId: req.user._id })
      .sort({ date: -1 });

    var yourReviews=await reviewModel.find({userid:req.user._id}).sort({date:-1})
    res.render("profile", { user: req.user, yourOrders,yourReviews});
  } catch (error) {
    res.render("404Error", { error });
  }
});
//review section
app.route("/review").post(async (req, res) => {
  try {
    var itemid=await itemModel.findOne({name:req.body.itemName}).select("name")
    var obj={
      itemid:itemid._id,
      storeId:req.body.storeId,
      userid:req.body.userid,
      stars:req.body.stars,
      review:req.body.review
    }
    await reviewModel.updateOne(obj,{upsert:true})
    res.redirect("/profile");
  } catch (error) {
    res.render("404Error", { error });
  }
});
app.route("/reviewremoveaddress").post(auth,async(req,res)=>{
  try{
     await Users.updateOne({_id:req.user._id},{$pull: {defaultAddress:req.body.address}})
     res.redirect("/profile")
  }catch(error){
    res.render("404Error",{error})
  }
})
app.route("/newitems").get(async (req, res) => {
  try {
    var newitems = await itemModel.find({}).sort({ createdAt: -1 });
    res.render("newitem", { newitems });
  } catch (error) {
    res.render("404Error", { error });
  }
});
//!@#$%^&*()(*&^%$#@!!!!@#$%^&**)
// admin side
//123456790-098765432!@@@@@@@@@@@@@#$%^&*()_
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "-" + Date.now());
  },
});
var upload = multer({ storage: storage });

app
  .route("/register")
  .get(async (req, res) => {
    try {
      await res.render("uploadItem");
    } catch (error) {
      res.render("404Error", { error });
    }
  })
  .post(upload.single("itemImg"), async (req, res) => {
    try {
      var newItem = new itemModel({
        name: req.body.name,
        size: req.body.size,
        price: req.body.price,
        description: req.body.description,
        itemImg: {
          data: fs.readFileSync(
            path.join(__dirname + "/uploads/" + req.file.filename)
          ),
          contentType: "image/png",
        },
      });

      var item = await newItem.save();
      res.redirect("/adminwork");
    } catch (error) {
      res.render("404Error", { error });
    }
  });
app.route("/adminwork").get(async (req, res) => {
  try {
    res.render("adminhome");
  } catch (error) {
    res.render("404Error", { error });
  }
});
app.route("/allitems").get(async (req, res) => {
  try {
    var items = await itemModel.find({});
    res.render("adminallitems", { items });
  } catch (error) {
    res.render("404Error", { error });
  }
});
app.route("/disableitemadmin/:id").post(async(req,res)=>{
  try{
    await itemModel.findOneAndUpdate({_id:req.params.id},{disable:req.body.disable})
    res.redirect("/allitems")
  }catch (error) {
    res.render("404Error", { error });
  }
})
app.route("/removeitemadmin/:id").get(async (req, res) => {
  try {
    await itemModel.findOneAndRemove({ _id: req.params.id });
    res.redirect("/allitems");
  } catch (error) {
    res.render("404Error", { error });
  }
});
app.route("/ordersadminside").get(async (req, res) => {
  try {
    var ordersnotcompleted = await placedModel
      .find({ $or: [{ delivered: -1 }, { delivered: 0 }] })
      .sort({ date: -1 });
    var orderscompleted = await placedModel
      .find({ delivered: 1 })
      .sort({ date: -1 });
    res.render("orderadmin", { ordersnotcompleted, orderscompleted });
  } catch (error) {
    res.render("404Error", { error });
  }
});
app.route("/ordersadminside1").get(async (req, res) => {
  try {
    var ordersnotcompleted = await placedModel
      .find({ $or: [{ delivered: -1 }, { delivered: 0 }] })
      .sort({ date: -1 });
    var orderscompleted = await placedModel
      .find({ delivered: 1 })
      .sort({ date: -1 });
    res.send({ ordersnotcompleted, orderscompleted });
  } catch (error) {
    res.render("404Error", { error });
  }
});
app.route("/admin/orderid/:orderid").get(async (req, res) => {
  try {
    var order = await placedModel.updateOne(
      { _id: req.params.orderid },
      { delivered: 0 }
    );
    res.redirect("/ordersadminside");
  } catch (error) {
    res.render("404Error", { error });
  }
});
///////
//otp confirmation
//////
var code = 0,
  orderid = "";
app
  .route("/entermailforfinaldelivery")
  .get(async (req, res) => {
    try {
      res.render("entermailforfinaldelivery");
    } catch (error) {
      res.render("404Error", { error });
    }
  })
  .post(async (req, res) => {
    try {
      orderid = req.body.orderid;
      const order = await placedModel
      .findOne({ _id: orderid })
      .select("delivered");
      if ( order.delivered == 0) {
        await placedModel.updateOne({ _id: orderid }, { delivered: 1 });
        res.send("<h1>order delivered successfully</h1><a href='/adminwork'>go back</a>")
      } else res.redirect("/adminwork");

    } catch (error) {
      res.render("404Error", { error });
    }
  });


//123456790-098765432!@@@@@@@@@@@@@#$%^&*()_


app.route("/admincreatestore")
   .get(async(req,res)=>{
     try{
      res.render("createStore")
     }catch(error){
      res.render("404Error", { error });
     }
   })
   .post(upload.single("storeImg"),async(req,res)=>{
     try{
        // console.log(req.body)
        // console.log(req.body.itemsId.split(","))
        const x={
            ...req.body,
            nameOfStore:req.body.name,
            address:req.body.straddress+"%"+req.body.strzone+"%"+req.body.strcity+"%"+req.body.strpincode+"%"+req.body.strstate,
            storeImg: {
              data: fs.readFileSync(
                path.join(__dirname + "/uploads/" + req.file.filename)
              ),
              contentType: "image/png",
            },
            itemsId:req.body.itemsId.split(",")
        }
        var store=new storeModel(x)
        // console.log(store)
        // console.log(req.body)
        await store.save()
        res.send("new store is created")
     }catch(error){
       res.render("404Error",{error})
     }
   })
app.route("/adminstores")
   .get(async(req,res)=>{
     try{
      const stores=await storeModel.find({}).populate("itemsId","name")
      // console.log(stores)
      res.render("adminStores",{stores})
     }
     catch(error){res.render("404Error", { error });}
   })


app.route("/adminoffer")
   .get(async(req,res)=>{
     try{
       res.render("adminoffer");
     }catch(error){
       res.render("404Error",{error})
     }
    })
    .post(async(req,res)=>{
      try{
          // console.log(req.body)
          var x={
             ...req.body,
             validFor:req.body.validFor.split(","),
             itemId:req.body.itemId.split(","),
             quantity:req.body.quantity.split(",")
          };
          // console.log(x)
          await new offersModel(x).save()
          res.redirect("/adminwork");
      }catch(error){
        res.render("404Error",{error})
      }
    })


app.route("/subadmin/login")
.get(async(req,res)=>{
  try{
    console.log("subadmin")
    res.render("subadmin/index")
  }catch(error){
    res.render("404Error",{error})
  }
})
.post(async(req,res)=>{
  try{
    console.log(req.body)
    var items=await itemModel.find({})
    var store=await storeModel.findOne({contactMail:req.body.email,password:req.body.password})
    console.log(store)
    if(store)
      res.render("subadmin/store",{store,items})
    else
      res.redirect("/subadmin/login")
  }catch{(error)=>res.render("404Error",{error})}
})


app.get("*",(req,res)=>{
  res.render("404Error",{error:"Page Not Found"})
})


const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("server started running on " + port);
});
