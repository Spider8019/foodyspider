const jwt= require("jsonwebtoken")
const lioModel=require("../mongoose/lioModel.js")

const auth = async(req,res,next) =>{

    try{
        const token=req.cookies.jwt
        const verify=jwt.verify(token,process.env.SECRET_KEY);
        const user=await lioModel.findOne({_id:verify._id})
        req.token=token
        req.user=user

         next()
    }
    catch(error){
        // res.send(error)
        res.redirect("/signup")
    }

}

module.exports=auth;