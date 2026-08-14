const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET

function authenticate(req, res, next){
    // get the token from the header
    // CORRECT
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    //if no token . reject
    if(!token){
        const err = new Error('No token provided')
        err.status = 401
        return next(err)
    }

    // verify the token
    jwt.verify(token, JWT_SECRET, (err, decode) => {
        if(err){
            const error = new Error('Invalid or expired token')
            error.status = 401
            return next(error)
        }

        // 4. attach user data to req so routes can use it
        // decoded contains { id, username } 
        req.user = decode

        next() // ← token is valid, move on to the route
    })
}

module.exports = authenticate