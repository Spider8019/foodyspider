const mongoose=require("mongoose")
const Items = require("./itemModel")
const schema=mongoose.Schema

const storeSchema= new mongoose.Schema({
  nameOfStore:{
      type:String,
      unique:true,
  },
  password:{
      required:true,
      type:String,
  },
  address:{
      type:String,
      required:true,
  },
  owner:{
      type:String,
  },
  description:{
      type:String,
  },
  storeImg:{
    data:Buffer,
    contentType:String
  },
  itemsId:[{
      type:schema.Types.ObjectId,
      ref:Items
  }],
  openingTime:{
      type:String,
      required:true
  },
  closingTime:{
      type:String,
      required:true,
  },
  daysInAWeek:{
      type:Number,
      default:7
  },
  contactNumber:{
      type:Number,
  },
  contactMail:{
      type:String,
  }, 
  amountForThisMonth:{
    type:Number,
    default:0
  },
  totalEarning:{
      type:Number,
      default:0
  },
  storeCreatedAt:{
     type:Date,
     default:Date.now
  },

})

module.exports= new mongoose.model("Stores",storeSchema)