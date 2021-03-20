
function addMoreSpecificDetail(THIS){
  var specificDetail=THIS.nextElementSibling;
  var cln = specificDetail.cloneNode(true);
  for(var i=0;i<cln.children.length;i++)
  {   
      if(cln.children[i].tagName=="INPUT")
       cln.children[i].value=""
  }
  THIS.parentElement.appendChild(cln);
}

function removeSpecificDetail(THIS){
    THIS.parentElement.remove();
}