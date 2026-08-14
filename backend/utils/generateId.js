const {randomUUID} = require('crypto')

module.exports = function generateId(){
    return randomUUID()
}

