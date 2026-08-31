function errorHandler(err, req, res, next){
    console.log(err)
    
    const status = err.status || 500
    const message = err.message || 'Something went wrong'

    res.status(status).json({ error: message, message })
}

module.exports = errorHandler
