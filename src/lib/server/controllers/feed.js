/**
 * PORTED from the Express backend: controllers/feed.js
 *
 * Converted CommonJS -> ESM. Handler bodies are otherwise unchanged: they still
 * take (req, res) and still read req.cookies / req.body / req.files, which the
 * express-adapter shim supplies. Do not "modernise" them in place — the value of
 * this file is that it is diffable against the original.
 */


export const getHome = (req,res,next) => {
    res.json({
        post: [{title:'First Post',content:"This is the first post!"}]
    })
}

export const getHealth = (req, res) => {
    res.status(200).json({ status: "ok" });
}