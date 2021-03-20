var mongoose=require("mongoose")
var bcrypt=require("bcryptjs")
var jwt=require("jsonwebtoken")

const loginoutSchema=new mongoose.Schema({
    name:{type:String,
          required:true
        },
    email:{type:String,
            required:true,
            unique:true
        },
    password:{
        type:String,
        required:true
    },
    tokens:[{
        token:{
            type:String,
            required:true
        }
    }],
    addToCart:[{
        item:{
            type:String,
            required:true
        },
        quantity:{
            type:String,
            required:true
        }
    }],
    purchase:[{
        item:{
            type:String,
            required:true
        },
        purchaseCount:{
            type:Number,
            default:0
        }
    }]
})


// generating auth token
loginoutSchema.methods.generateAuthToken = async function(){
    try{
            var token=jwt.sign({_id:this._id.toString()},process.env.SECRET_KEY)
            this.tokens=this.tokens.concat({token:token})
            await this.save()
            return token
    }
    catch(error){
        console.log("there is an error")
    }
}

// hashing passwords
loginoutSchema.pre("save",async function(next){
  if(this.isModified('password'))
  {
   this.password=await bcrypt.hash(this.password,10)
   }
   next()
})

module.exports=new mongoose.model("lioModel",loginoutSchema)