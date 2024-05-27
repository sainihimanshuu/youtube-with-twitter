
const newFunction=(handleFunction) => (givenName, givenAge) => {
    handleFunction(givenName, givenAge)
    return "hello"
    //console.log(`name is ${givenName} and the age is ${givenAge}`)
}



const name="himanshu"
const age=20

function printNameAge(nameeee, aaaage){
    console.log(`by default name is ${nameeee} and the age is ${aaaage}`)
}

const response=newFunction(function printNameAge(nameeee, aaaage){
    console.log(`by new function name is ${nameeee} and the age is ${aaaage}`)
})

printNameAge(name, age)
console.log(response)

