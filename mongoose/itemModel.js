var mongoose =require("mongoose")
const itemSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    size:{
        type:Array,
        required:true
    },
    price:{
        type:Array,
        required:true
    },
    description:{
        type:String
    },
    orderCount:{
        type:Number,
        default:0
    },
    itemImg:{
        data:Buffer,
        contentType:String
    },
    createdAt:{
        type:Date,
        default:Date.now,
        index:true
    }
})

module.exports=new mongoose.model("Items",itemSchema)