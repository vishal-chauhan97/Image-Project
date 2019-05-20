var express = require("express");
var app = express();
var path = require('path');
var multer = require('multer');
var multerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
        console.log(JSON.stringify(file, null, 4));
        cb(null, Date.now() + '.' + path.extname (file.originalname));
    }
  });

var upload = multer({ storage: multerStorage })
var fs = require("fs");
var sizeOf = require('image-size');
var Jimp = require('jimp');

//Google Cloud Service
var {Storage} = require("@google-cloud/storage");

var storage = new Storage({
  projectId: 'august-list-241017',
  keyFilename: 'google-cloud-service.json'
})

// Creates the upload folder incase it doesn't exist
if(!fs.existsSync("./uploads")){
    fs.mkdirSync("./uploads")
}

var BUCKET_NAME = 'my-image-project'

bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")))
app.use("/uploads", express.static(path.join(__dirname, "uploads")))
app.set('views', __dirname + '/public/views');
app.set("view engine", "ejs");

app.get("/", function (req, res) {
    res.render("upload-form");
})
app.post("/cloud", function(req, res){
    var files  = JSON.parse(req.body.files);
    for(var i=0; i<files.length; i++){
        uplodToCloud(files[i].filepath);
    }
    res.send("done");
})

app.post("/upload", upload.single("desc"), async function (req, res) {
   //using mime type of detect whether a file is image or not
    var name = req.file.mimetype;
    console.log(req.file);

    if (name.includes("image")) {
        //sizeOf tells the dimensions of our image, only look for dimensions if it's an image
        var dimensions = sizeOf(req.file.path);
        console.log(dimensions);
        if (dimensions.height == "1200" && dimensions.width == "1200") {
           
            console.log("Starting conversion");

            console.log(await convert1(req.file.path, 755, 450, req.file.filename + '1.' + dimensions.type));
            var path1 = "uploads/copies/" + req.file.filename + '1.' + dimensions.type;
            await convert1(req.file.path, 365, 450, req.file.filename + '2.' + dimensions.type);
            var path2 = "uploads/copies/" + req.file.filename + '2.' + dimensions.type;
            await convert1(req.file.path, 365, 212, req.file.filename + '3.' + dimensions.type);
            var path3 = "uploads/copies/" + req.file.filename + '3.' + dimensions.type;
            await convert1(req.file.path, 380, 380, req.file.filename + '4.' + dimensions.type);
            var path4 = "uploads/copies/" + req.file.filename + '4.' + dimensions.type;
            var files = [
                { filepath: path1, size : "755 X 450" },
                { filepath: path2, size : "365 X 450" },
                { filepath: path3, size : "365 X 212"},
                { filepath: path4, size : "380 X 380"}
            ]
            for(var i=0; i<files.length; i++){
               await uplodToCloud(files[i].filepath);
            }
            for(var i=0; i<files.length; i++){
                var value= files[i].filepath;
                var removeData=value.replace("uploads/copies/","");
                files[i].filepath = getUrl(removeData);
            }
            console.log(files);
            res.render("show", { files: files });
        }
        else {
            delete1(req.file.path);
            res.redirect("/");
        }
    }
    else {
        delete1(req.file.path);
        res.redirect("/");
    }
})

//to delete file if it not valid 
function delete1(path1) {
    fs.unlink(path1, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("done");
        }
    })
}


//function to resize image using jimp
async function convert1(path, ht, wt, name) {
    return await Jimp.read(path)
        .then(lenna => {
            return lenna
                .resize(ht, wt) // resize
                .quality(60) // set JPEG quality
                //   .greyscale() // set greyscale
                .write("./uploads/copies/" + name); // save
        })
        .catch(err => {
            console.error(err);
        });
}

app.listen(3000, function () {
    console.log("running ");
})



    
// upload file to bucket
async function uplodToCloud(path) {
    await storage.bucket(BUCKET_NAME).upload(path, {
        gzip: true,
        metadata: {
          cacheControl: 'public, max-age=31536000',
        },
      });   
}
    
// get public url for file
function getUrl(path){
    return `https://storage.googleapis.com/${BUCKET_NAME}/${path}`
}
