function errorHandler(err, req, res, next){
    console.log(err)
    
    const status = err.status || 500
    const messgae = err.message || 'Something went wrong'

    res.status(status).json({error : messgae})
}

module.exports = errorHandler
