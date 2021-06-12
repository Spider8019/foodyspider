var mongoose=require("mongoose")
const Items=require("./itemModel")
const Stores=require("./stores")

const reviewSchema=new mongoose.Schema({
   itemid:{type:mongoose.Schema.Types.ObjectId,
           ref:Items,
           required:true},
   storeId:{type:mongoose.Schema.Types.ObjectId,
            ref:Stores,
            required:true},
   userid:{type:String,required:true},
   review:{type:String,required:true},
   stars:{type:Number,required:true},
   date:{
      type:String,
      default:new Date().toISOString().slice(0,10)
   }
})

module.exports=new mongoose.model("reviewModel",reviewSchema)