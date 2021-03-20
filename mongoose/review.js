var mongoose=require("mongoose")

const reviewSchema=new mongoose.Schema({
   itemid:{type:String,required:true},
   userid:{type:String,required:true},
   review:{type:String,required:true},
   stars:{type:Number,required:true},
   date:{
      type:String,
      default:new Date().toISOString().slice(0,10)
   }
})

module.exports=new mongoose.model("reviewModel",reviewSchema)