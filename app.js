//jshint esversion:6
require('dotenv').config()
const express=require('express')
const bodyParser=require('body-parser');
var cookieParser=require('cookie-parser')
var bcrypt=require('bcryptjs')
var fs = require('fs');
var path = require('path');
var multer = require('multer');


const mongoose=require('mongoose')
mongoose.connect("mongodb+srv://SPIDER8019_ADMIN:rajput@spiderfoodcluster.uqxic.mongodb.net/pizza-boy?retryWrites=true&w=majority",{useNewUrlParser:true,useCreateIndex:true})


 //mongoose.connect("mongodb://localhost:27017/pizza-boy",{useNewUrlParser:true,useCreateIndex:true,useUnifiedTopology:true})

var itemModel=require("./mongoose/itemModel")
var Users=require("./mongoose/lioModel")
var reviewModel=require("./mongoose/review")
var placedModel=require("./mongoose/orderPlaceModel")
var auth=require("./middleware/auth")
var {codeconfirm}=require("./accounts/otpconfimmail.js")
var {forgetpassword}=require("./accounts/forgetpasswordemail.js")

const app=express()
app.use(cookieParser())
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");



app.route("/")
    .get(auth,async (req,res)=>{
        var items=await itemModel.find({})
        var most=items
        most.sort((a,b) => (a.orderCount > b.orderCount) ? 1 : ((b.orderCount > a.orderCount) ? -1 : 0))
        most.reverse()

        var avgRatings=[];
        for(var i=0;i<items.length;i++){
            var ratings=await reviewModel.find({itemid:items[i]._id})
            var avgstars=0;
            if(ratings.length!=0){
                var allstars=0;
               for(var j=0;j<ratings.length;j++)
               {
                 allstars+=ratings[j].stars
               }
               avgstars=allstars/ratings.length;
               var obj={
                   stars:avgstars.toFixed(2),reviewCount:ratings.length
               }
            }
            else
            var obj={
                   stars:"No-review",reviewCount:0
               }
            avgRatings.push(obj)
        }
            res.render("index",{result:items,user:req.user,most,avgRatings})
        })
      .post(auth,async (req,res)=>{
        try{
        result=await itemModel.find({description: { "$regex": req.body.Item.toLowerCase(), "$options": "i" }})
        res.render("available",{availableItems:result})
        }
        catch(error){
            res.send(`there is an error ${error}`)
        }
    })


app.get("/order/:orderItemId", async (req,res)=>{
        try{
            var result=await itemModel.findOne({'_id':req.params.orderItemId})

            var reviews= await reviewModel.find({itemid:req.params.orderItemId}).sort({date:-1})
            var reviewUserNames=[]
            for(var i=0;i<reviews.length;i++){
                var reviewGiverName=await Users.findOne({_id:reviews[i].userid},{name:1,_id:0})
               reviewUserNames.push(reviewGiverName)

            }


            res.render("order",{result,reviews,reviewUserNames})


        }
        catch(error){
            res.send(`there is an error ${error}`)
        }
    })

// cart routes
app.get("/wishlist/:userid",auth,async(req,res)=>{
    try{
        var userAccount=await Users.findOne({_id:req.params.userid})

        var items=[];
        for(var i=0;i<userAccount.addToCart.length;i++){
            var result =await itemModel.findOne({_id:userAccount.addToCart[i].item})
            
            items.push(result)
        }
        console.log(items)
        res.render("yourcart",{userAccount,items})
    }
    catch(error){
        res.send(`there is an error ${error}`)
    }
})
app.post("/addtocart",auth,async(req,res)=>{
    try{
        var user=await Users.findOne({_id:req.user._id})
        user.addToCart=user.addToCart.concat({item:req.body.id,quantity:req.body.quantities})
        await user.save()
        res.redirect("/wishlist/"+req.user.id)
    }
    catch(error){
        res.send(`there is an error ${error}`)
    }
})
app.get("/removefromcart/:itemId/userid/:userid",auth,async(req,res)=>{
    try{
        console.log(req.params.itemId)
        var user=await Users.findOne({_id:req.params.userid})
        var count=0;
        user.addToCart=user.addToCart.filter((item)=>{
            return item._id!=req.params.itemId
        })
        await user.save()
        res.redirect("/wishlist/"+req.params.userid)
    }catch(error){
        res.send(`there is an error: ${error}`)
    }
})
app.route("/placeorder")
       .post(auth,async(req,res)=>{
           try{
               var item=await itemModel.findOne({_id:req.body.id})
               var user=req.user
               res.redirect("/getdeliveryinfo/itemid/"+item._id+"./quantity/"+req.body.quantities+".")
           }
           catch(error){
               res.send(`there is an error ${error}`)
           }
       })

app.route("/getdeliveryinfo/itemid/:itemid/quantity/:quantity")
       .get(auth,async(req,res)=>{
           try{
               var itemsparam=req.params.itemid.split(".") ;
               var items=[]
               for(var i=0;i<itemsparam.length-1;i++){
                 var item=await itemModel.findOne({_id:itemsparam[i]})
                 items.push(item)
               }
               res.render("placeOrder",{items,quantities:req.params.quantity,username:req.user.name,usermail:req.user.email})
           }
           catch(error){
               res.send(`there is an error ${error}`)
           }
       })
app.route("/getdeliveryinfo")
        .post(auth,async(req,res)=>{
           try{ 
           var total=0;
        //    console.log(req.body.item)
           for(var i=0;i<req.body.quantities.split("$").length-1;i++){
               total=total+ parseInt(req.body.quantities.split("$")[i])
           }
            var user=await Users.findOne({_id:req.user._id})
            var x=user.purchase.findIndex((value)=>{return value.item==req.body.item})
            if(x>-1)
                user.purchase[x].purchaseCount+=total
            else
                user.purchase.push({item:req.body.item,purchaseCount:1})
            await user.save()

            var dish=await itemModel.findOne({name:req.body.item})
            dish.orderCount+=total;
            await dish.save()

        //    console.log(req.body)
            var fulladdress=req.body.flat+ "( "+req.body.landmark+"), "+req.body.colony+","+req.body.zone+", "+req.body.city

            var obj=new placedModel({
                reciever:req.body.reciever,
                loginUser:req.user._id,
                fulladdress:fulladdress,
                email:req.body.email,
                contact:req.body.contactnumber,
                item:req.body.item,
                quantity:req.body.quantities
            })
            await obj.save()
            res.redirect("/profile")

           }
           catch(error){
               res.send(`there is an error ${error}`)
           }
      
       })
// after giving address for delivery

// login logout signup  routes
app.route("/signup")
   .get(function(req,res){
       res.render("signup")
   })
   .post(async(req,res)=>{
       try{
            const obj = new Users({
            name:req.body.userName,
            email:req.body.email,
            password:req.body.password
            })

            const token=await obj.generateAuthToken()
            console.log(token)

            res.cookie("jwt",token,{expires:new Date(Date.now()+600000000),httpOnly:true})

            const userprofile=await obj.save()
            
            res.redirect("/")


        }
     catch(error){
         res.send(`there is an eror ${error}`)
     }
    })
app.route("/checkforavailmail")
   .post(async(req,res)=>{
    try{
        var x= await Users.findOne({email:req.body.email})
        if(x)
          res.send("This email is already in use")
        else
          res.send("Available")
    }
    catch(error){
        res.send(`there is an error ${error}`)
    }

   })
app.route("/login")
    .get(async(req,res)=>{
        try{
            // res.send("aman pratap singh")
             await res.render("login")
        }
        catch(error){
              res.send(`there is an error ${error}`)
        }

    })
    .post(async(req,res)=>{
        try{
            var user=await Users.findOne({
                email:req.body.emailLogin
            })
            var isMatch=await bcrypt.compare(req.body.passwordLogin,user.password)
            console.log(isMatch)
            if(isMatch)
            {
                var token =await user.generateAuthToken()
                console.log(token)
                res.cookie("jwt",token,{expires:new Date(Date.now()+600000000),httpOnly:true})
                

                res.redirect("/")
            }
        }catch(e)
        {
            res.status(400).send(`user is not find ${e}`)
        }
    })
app.get("/logout",auth,async function(req,res){
     res.clearCookie("jwt")      
     req.user.tokens=[]
     req.user.save()
     res.redirect("/login")

})
app.route("/forgetpassword")
    .get(async(req,res)=>{
        try{
            res.render("forgetpassword")
        }catch(error){res.send(`there is an error ${error}`)}
    })
    .post(async(req,res)=>{
        try{
            var userwithMail=await Users.findOne({email:req.body.email})
            if(userwithMail){
              forgetpassword(req.body.email)
              res.send("&#x2713; Sent successfully! Please check your email.")}
            else
              res.send("Sorry we have no acccount with given credentials !")
        }catch(error){res.send(`there is an error ${error}`)}
    })
app.route("/resetpassword/:email")
   .get(async(req,res)=>{
       try{
           res.render("resetpassword",{email:req.params.email})
       }catch(error){
           res.send(`there is an error ${error}`)
       }
   })

app.route("/resetpasswordaccount")
   .post(async(req,res)=>{
       try{
           await Users.updateOne({email:req.body.email},{"password":req.body.resetpassone})
           res.redirect("/login")
       }catch(error){res.send(`there is an error ${error}`)}
   })

////profile section
app.get("/profile",auth,async (req,res)=>{
    try{

        var yourOrder=await placedModel.find({loginUser:req.user._id}).sort({date:-1})
        var purchase=[]
        for(var i=0;i<req.user.purchase.length;i++){
            var item=await itemModel.findOne({name:req.user.purchase[i].item})
            purchase.push(item)
        }
        res.render("profile",{user:req.user,purchase:purchase,yourOrder})
    }
    catch(error){
        res.send(`there is an error ${error}`)
    }
})
//review section
app.route("/review")
     .post(async(req,res)=>{
         try{
             var obj =new reviewModel({
                 itemid:req.body.itemid,
                 userid:req.body.userid,
                 review:req.body.review,
                 stars:req.body.stars
             })
             await obj.save()
             res.redirect("/profile")
         }

         catch(error){
             res.send(`there is an error ${error}`)
         }
     })
app.route("/newitems")
   .get(async(req,res)=>{
       try{
           var newitems=await itemModel.find({}).sort({createdAt:-1})
           res.render("newitem",{newitems})
       }catch(error){res.send(`there is an error ${error}`)}
   })
//!@#$%^&*()(*&^%$#@!!!!@#$%^&**)
// admin side
//123456790-098765432!@@@@@@@@@@@@@#$%^&*()_
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});
var upload = multer({ storage: storage });

app.route("/register")
   .get(async(req,res)=>{
    try{
        await res.render("uploadItem")
    }
    catch(error){
        res.send(`there is an error ${error}`)
    }
   })
   .post(upload.single('itemImg'),async(req,res)=>{
       try{
            var newItem=new itemModel({
                name:req.body.name,
                size:req.body.size,
                price:req.body.price,
                description:req.body.description,
                itemImg:{
                                data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
                                contentType: 'image/png'
                            }})
            
            var item=await newItem.save()
            res.redirect("/adminwork")
       }catch(error){
           res.send(`there is an error ${error}`)
       }
   })
app.route("/adminwork")
   .get(async(req,res)=>{
       try{
           res.render("adminhome")
       }
       catch(error){
           res.send(`there is an error ${error}`)
       }
   })
app.route("/allitems")
    .get(async(req,res)=>{
        try{
            var items=await itemModel.find({})
            res.render("adminallitems",{items})
        }catch(error){
            res.send(`there is an error ${error}`)
        }
    })
app.route("/removeitemadmin/:id")
    .get(async(req,res)=>{
        try{
            await itemModel.findOneAndRemove({_id:req.params.id})
            res.redirect("/allitems")
        }catch(error){res.send(`there is an error ${error}`)}
    })
app.route("/ordersadminside")
    .get(async(req,res)=>{
        try
        {
            var ordersnotcompleted=await placedModel.find({$or:[{delivered:-1},{delivered:0}]}).sort({date:-1})
            var orderscompleted=await placedModel.find({delivered:1}).sort({date:-1})
            res.render("orderadmin",{ordersnotcompleted,orderscompleted})
        }
        catch(error){res.send(`there is an error ${error}`)}
    })
app.route("/ordersadminside1")
    .get(async(req,res)=>{
        try
        {
            var ordersnotcompleted=await placedModel.find({$or:[{delivered:-1},{delivered:0}]}).sort({date:-1})
            var orderscompleted=await placedModel.find({delivered:1}).sort({date:-1})
            res.send({ordersnotcompleted,orderscompleted})
        }
        catch(error){res.send(`there is an error ${error}`)}
    })
app.route("/admin/orderid/:orderid")
    .get(async(req,res)=>{
        try{
          var order=await placedModel.updateOne({_id:req.params.orderid},{delivered:0})
          res.redirect("/ordersadminside")
        }catch(error){
           res.send(`there is an error on admin side ${error}`)
        }
    })
///////
//otp confirmation
//////
var code=0,orderid="";
app.route("/entermailforfinaldelivery")
    .get(async(req,res)=>{
        try{
            res.render("entermailforfinaldelivery")
        }catch(error){
            res.send(`there is an error ${error}`)
        }
    })
    .post(async(req,res)=>{
        try{
           orderid=req.body.orderid
           code=Math.floor(Math.random()*900000)+100000
           console.log(code)
           email=req.body.email
            await codeconfirm(email,code)
            console.log("mail sent successfully")
            res.render("deliveredconfiramtion")
        }catch(error){
            console.log(error)
            res.send(`there is an error ${error}`)
        }
    })
app.route("/deliveredconfiramtion")
    .post(async(req,res)=>{
        try{
            if(req.body.otpcode==code)
             await placedModel.updateOne({_id:orderid},{delivered:1})
             else 
              res.redirect("/deliveredconfiramtion")
             res.redirect("/adminwork")
        }catch(error){
            console.log(error)
            res.send(`there is an error ${error}`)
        }
    })


const port=process.env.PORT || 3000

app.listen(port,()=>{
    console.log("server started running on "+port)
})
