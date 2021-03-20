console.log("connected successfully")
var array=[{city:"Ayodhya(Faizabad)",
            zone:["Naka","Rekabganj","Chowk","Niyawan","Shadatganj","Fatehganj"]},{city:"Lucknow",
            zone:["Gomti Nagar","Polytechnic","Hazratganj","Charbagh","Alambagh"]}]


for(var i=0;i<array.length;i++){
   var city=document.createElement("option")
   city.innerHTML=array[i].city
   city.value=array[i].city
   document.querySelector(".city").append(city)
}
for(var i=0;i<array[0].zone.length;i++){
        var zone=document.createElement("option")
        zone.innerHTML=array[0].zone[i]
        zone.value=array[0].zone[i]
        document.querySelector(".zone").append(zone)
}
function setCity(city){

    var zones=document.querySelector(".zone");
    while(zones.firstChild){
        zones.removeChild(zones.firstChild)
    }   
    var x=-1;
    for(var i=0;i<array.length;i++){
        if(array[i].city===city)
        {x=i;break;}
    }
    for(var i=0;i<array[x].zone.length;i++){
        var state=document.createElement("option")
        state.innerHTML=array[x].zone[i]
        state.value=array[x].zone[i]
        document.querySelector(".zone").append(state)
    }

}