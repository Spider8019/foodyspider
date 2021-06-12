//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var bcrypt = require("bcryptjs");
var fs = require("fs");
var path = require("path");
var multer = require("multer");
var request = require('request');

const mongoose = require("mongoose");

const connectdb=async () => {
  try {
    await mongoose.connect("mongodb+srv://spider8019:spider8019pizzaboy@cluster0.7slke.mongodb.net/firstDb?retryWrites=true&w=majority",{useNewUrlParser:true,useCreateIndex:true,useUnifiedTopology: true,useFindAndModify: false})
    console.log("Server connected successsfully")
  } catch (err) {
    console.log('error: ' + err)
  }
}
connectdb()



// mongoose.connect("mongodb://localhost:27017/pizza-boy", {
//   useNewUrlParser: true,
//   useCreateIndex: true,
//   useUnifiedTopology: true,
// });

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
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");


var CLIENT =
  'AUJoKVGO3q1WA1tGgAKRdY6qx0qQNIQ6vl6D3k7y64T4qh5WozIQ7V3dl3iusw5BwXYg_T5FzLCRguP8';
var SECRET =
  'EOw8LNwDhM7esrQ3nHfzKc7xiWnJc83Eawln4YLfUgivfx1LGzu9Mj0F5wlarilXDqdK9Q5aHVo-VGjJ';
var PAYPAL_API = 'https://api-m.sandbox.paypal.com';

app.post('/my-api/create-payment/', function(req, res)
{
  // 2. Call /v1/payments/payment to set up the payment
  request.post(PAYPAL_API + '/v1/payments/payment',
  {
    auth:
    {
      user: CLIENT,
      pass: SECRET
    },
    body:
    {
      intent: 'sale',
      payer:
      {
        payment_method: 'paypal'
      },
      transactions: [
      {
        amount:
        {
          total: '5.99',
          currency: 'USD'
        }
      }],
      redirect_urls:
      {
        return_url: 'https://example.com',
        cancel_url: 'https://example.com'
      }
    },
    json: true
  }, function(err, response)
  {
    if (err)
    {
      console.error(err);
      return res.sendStatus(500);
    }
    // 3. Return the payment ID to the client
    res.json(
    {
      id: response.body.id
    });
  });
})


app
  .route("/")
  .get(auth, async (req, res) => {
    console.log("home page")
    var items = await itemModel.find({});
    var stores=await storeModel.find({ "address": { "$regex": req.user.defaultCity, "$options": "i" } }).populate("itemsId");
    var offers=await offersModel.find({}).populate("itemId","itemImg name");
    let most = items;
    most.sort((a, b) =>
      a.orderCount > b.orderCount ? 1 : b.orderCount > a.orderCount ? -1 : 0
    );
    most.reverse();

    var avgRatings = [];
    for (var i = 0; i < items.length; i++) {

      var ratings = await reviewModel.find({ itemid: items[i]._id });
      var avgstars = 0;
      if (ratings.length != 0) {
        var allstars = 0;
        for (var j = 0; j < ratings.length; j++) {
          allstars += ratings[j].stars;
        }
        avgstars = allstars / ratings.length;
        var obj = {
          stars: avgstars.toFixed(2),
          reviewCount: ratings.length,
        };
      } else
        var obj = {
          stars: "No-review",
          reviewCount: 0,
        };
      avgRatings.push(obj);
    }
    res.render("index", { result: items, user:req.user, most, avgRatings,stores,cities,offers});
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
      var items = [];
      for (var i = 0; i < itemsparam.length-1; i++) {
        var item = await itemModel.findOne({ _id: itemsparam[i] }).select("name size");
        items.push(item);
      }

      var storesparam = req.params.storeId.split(".");
      var stores = [];
      for (var i = 0; i < storesparam.length-1; i++) {
        var store = await storeModel.findOne({ _id: storesparam[i] }).select("nameOfStore");
        stores.push(store);
      }
      res.render("placeOrder", {
        items,
        stores,
        quantities: req.params.quantity,
        storeId:req.params.storeId,
        username: req.user.name,
        usermail: req.user.email,
      });
      //    res.json({})
    } catch (error) {
      res.render("404Error", { error });
    }
  });
app.route("/getdeliveryinfo").post(auth, async (req, res) => {
  try {

    let user=req.user.purchase
    let withoutDup = req.body.storeId.split(".").slice(0,-1).filter((c, index) => {
      return req.body.storeId.split(".").slice(0,-1).indexOf(c) == index;
    });
    var x=req.body.storeId.split(".")
    var fulladdress =
    req.body.flat +
    "( " +
    req.body.landmark +
    "), " +
    req.body.colony +
    "," +
    req.body.zone +
    ", " +
    req.body.city;
    // console.log(x)
    for(var i=0;i<withoutDup.length;i++){
       var obj={
         reciever:req.body.reciever,
         loginUserId:req.user._id,
         fulladdress:fulladdress,
         storeId:withoutDup[i],
         email:req.body.email,
         contact:req.body.contactnumber,
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
       await placedModel.create(obj)
       if(req.user.purchase.length!=0){
         for(var k=0;k<obj.item.length;k++){
          var flag=0;
          await itemModel.updateOne({name:obj.item[k]},{$inc : {'orderCount' : Number(obj.quantity[k].slice(0,-1))}})
          for(var x=0;x<req.user.purchase.length;x++){
            if(req.user.purchase[x].item==obj.item[k] && req.user.purchase[x].storeId==obj.storeId){
              req.user.purchase[x].purchaseCount+=Number(obj.quantity[k].slice(0,obj.quantity[k].length-1))
              flag=1;
            }
           }
          if(flag==0) {
            var temp={
              item:req.body.item.split(".")[0],
              purchaseCount:1,
              storeId:req.body.storeId.split(".")[i]}
            req.user.purchase.push(temp)
          }
         }
        }
       else 
       {
          var temp={
            item:req.body.item.split(".")[0],
            purchaseCount:1,
            storeId:req.body.storeId.split(".")[i]}
          req.user.purchase.push(temp)
        }
    }
    await req.user.save()
    await Users.updateOne({_id:req.user._id},{purchase:req.user.purchase})
    res.render("success");
  } catch (error) {
    // console.log(error)
    res.render("404Error", { error });
  }
});

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
    var yourOrder = await placedModel
      .find({ loginUserId: req.user._id })
      .sort({ date: -1 });
  
    var purchase = [];
    var stores=[];
    // console.log(req.user)
    for (var i = 0; i < req.user.purchase.length; i++) {
      var item = await itemModel.findOne({ name: req.user.purchase[i].item });
      purchase.push(item);
      var store=await storeModel.findOne({_id:req.user.purchase[i].storeId})
      stores.push(store)
    }
    // console.log(store)

    // console.log(purchase)
    res.render("profile", { user: req.user, yourOrder,purchase,stores });
  } catch (error) {
    res.render("404Error", { error });
  }
});
//review section
app.route("/review").post(async (req, res) => {
  try {
    var obj = new reviewModel({
      itemid: req.body.itemid,
      storeId:req.body.storeId,
      userid: req.body.userid,
      review: req.body.review,
      stars: req.body.stars,
    });
    await obj.save();
    res.redirect("/profile");
  } catch (error) {
    res.render("404Error", { error });
  }
});
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
      code = Math.floor(Math.random() * 900000) + 100000;
      //    console.log(code)
      email = req.body.email;
      await codeconfirm(email, code);
      console.log("mail sent successfully");
      res.render("deliveredconfiramtion");
    } catch (error) {
      res.render("404Error", { error });
    }
  });
app
  .route("/deliveredconfiramtion")
  .get(async (req, res) => {
    try {
      res.send("<h1>OTP MATCHED! You can give order to him.</h1>");
    } catch (error) {
      res.render("404Error", { error });
    }
  })
  .post(async (req, res) => {
    try {
      const order = await placedModel
        .findOne({ _id: orderid })
        .select("delivered");
      if (req.body.otpcode == code && order.delivered == 0) {
        await placedModel.updateOne({ _id: orderid }, { delivered: 1 });
        res.redirect("/deliveredconfiramtion");
      } else res.redirect("/adminwork");
    } catch (error) {
      // console.log(error)
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

app.get("*",(req,res)=>{
  res.render("404Error",{error:"Page Not Found"})
})


const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("server started running on " + port);
});
