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
    itemImg:{
        data:Buffer,
        contentType:String
    },
    disable:{
        type:Number,
        default:0
    },
    createdAt:{
        type:Date,
        default:Date.now,
        index:true
    }
})
// 0 means disabled
// 1 means available
module.exports=new mongoose.model("Items",itemSchema)