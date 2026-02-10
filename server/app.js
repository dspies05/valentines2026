const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const multer = require("multer");
const cors = require("cors");

const app = express();
const port = 3001;
const pagesStorage = "./data/pages.json";
const password = "P6l1KqXGrTRE7rnf4tRy2uuTjd6R9YeK";

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static("uploads"));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    if(!file || !file.originalname){
      console.log(typeof file.originalname)
      return cb(new Error("Invalid file"))
    }
    const ext = path.extname(file.originalname).toLowerCase();
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${Date.now()}${ext}`);
  }
})

const upload = multer({
  storage,
  limits: {fileSize: 5* 1024 * 1024},
  fileFilter: (req, file, cb) => {
    if(!file.mimetype || !file.mimetype.startsWith("image/")){
      return cb(new Error("Only images allowed"));
    }
    cb(null, true);
  }
})

app.post("/api/images", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const location = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

  res.json({ location });
});


// app.use('/api', function(req, res, next){
//   var key = req.query['api-key'];

//   // key isn't present
//   if (!key) return next(error(400, 'api key required'));

//   // key is invalid
//   if (apiKeys.indexOf(key) === -1) return next(error(401, 'invalid api key'))

//   // all good, store req.key for route access
//   req.key = key;
//   next();
// });

app.post('/login', async(req, res) =>{
  if(req.body.password === password){
    res.status(200).send({status: "success"});
  }
  else{
    res.status(403).send("Forbidden");
  }
});

app.get('/api/pages', async (req, res, next) => {
  try{
    const data = await fs.readFile(pagesStorage, 'utf-8');
    res.send(JSON.parse(data));
  }  
  catch (err){
    res.status(444).json();
  }
})

app.put('/api/pages',async (req, res) => {
  try{
    const pages = JSON.stringify(req.body);
    await fs.writeFile(pagesStorage, pages);
    res.status(200).json({ success: true });
  }
  catch(err){
    console.error(err);
    res.status(500).send({ error: "Sorry, could not write data" });
  }
})

app.use(function(req, res){
  res.status(404);
  res.send({ error: "Sorry, can't find that" });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
})
