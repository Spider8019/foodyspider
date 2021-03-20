    function changeValueDec(THIS,PRICE){
        var x= parseInt(THIS.nextElementSibling.innerHTML)
        if(x>0){
        THIS.nextElementSibling.innerHTML = x - 1
        THIS.parentElement.parentElement.nextElementSibling.children[0].innerHTML =x-1 + 'x' + PRICE + ': ₹ ' + (x-1) * PRICE}
        else 
        THIS.style.disabled=true

        totalValue()
        generateReqData()
    }
    function changeValueInc(THIS, PRICE) {
            THIS.previousElementSibling.innerHTML = parseInt(THIS.previousElementSibling.innerHTML) +1
            THIS.parentElement.parentElement.nextElementSibling.children[0].innerHTML = parseInt(THIS.previousElementSibling.innerHTML) + 'x' + PRICE + ': ₹ ' + parseInt(THIS.previousElementSibling.innerHTML) * PRICE

            totalValue()
            generateReqData()
        }
    function totalValue(){
        var x=document.querySelectorAll(".subtotalparts");
        var subtotal=0;
        x.forEach((y)=>{
                subtotal+=parseInt(y.innerHTML.split(": ₹ ")[1])
        })
        document.getElementById("total").innerHTML="Your total : ₹"+subtotal;


    // to disable or able add tocart or place your order button
     var orderButton=document.querySelectorAll(".del-content-submit-button")
     if(subtotal==0)
     {
      orderButton[0].classList.remove("abledButton")
      orderButton[1].classList.remove("abledButton")
    }
    else   
     {
      orderButton[0].classList.add("abledButton")
      orderButton[1].classList.add("abledButton")
    }
    }
  var ic = document.querySelectorAll(".itemCount")
  function generateReqData(){
       
        var cq = "";
        ic.forEach((item)=>{
            cq+=item.innerHTML+"$"
        })
        document.getElementsByName("quantities")[0].value=cq; 
        document.getElementsByName("quantities")[1].value=cq
    }