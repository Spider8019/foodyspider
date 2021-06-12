function handleChange(checkbox) {
    if(checkbox.checked == true){
        console.log(checkbox.value)
        document.cookie("city="+checkbox.value);
    }
}