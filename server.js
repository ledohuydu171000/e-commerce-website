//importing packages
const express = require('express');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const path = require('path');

//firebase admin setup
let serviceAccount = require("./e-com-website-430dd-firebase-adminsdk-x24vj-a4af4649ae.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

let db = admin.firestore();

const aws = require('aws-sdk');
const dotenv = require('dotenv');
const { parse } = require('path');
const { url } = require('inspector');

dotenv.config();

const region = "us-west-2";
const bucketName = "ecom-website-dhd";
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

aws.config.update({
    region, accessKeyId, secretAccessKey
})

const s3 = new aws.S3();

async function generateUrl(){
    let date = new Date();
    let id = parseInt(Math.random() * 10000000000);

    const imageName = `${id}${date.getTime()}.jpg`;

    const params = ({
        Bucket: bucketName,
        Key: imageName,
        Expires: 300,
        ContentType: 'image/jpeg'
    })
    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    return uploadUrl;
}
//declare stattic path
let staticPath = path.join(__dirname, "public");
    
//intializing express.js
const app = express();

//middlewares
app.use(express.static(staticPath));
app.use(express.json());

//routes
//home route
app.get("/", (req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
}) 

//signup route
app.get("/signup", (req, res) => {
    res.sendFile(path.join(staticPath, "signup.html"));
})

app.post('/signup', (req, res) => {
    let { name, email, password, number, tac, notifications} = req.body;

    //form validation
    if(name.length < 3){
        return res.json({'alert': 'name must be 3 letters long'});
    } else if(!email.length){
        return res.json({'alert': 'enter your email'});
    } else if(password.length < 8){
        return res.json({'alert': 'password must be 8 characters long'});
    } else if(!number.length){
        return res.json({'alert': 'enter your phone number'});
    } else if(!Number(number) || number.length < 10){
        return res.json({'alert': 'invalid number, please enter valid one'});
    } else if(!tac){
        return res.json({'alert': 'you must agree to our terms and condition'});
    }

    //store user in db
    db.collection('users').doc(email).get()
    .then(user => {
        if(user.exists){
            return res.json({'alert': 'email already exists'});
        } else {
            bcrypt.genSalt(10, (err, salt) => {
                bcrypt.hash(password, salt, (err, hash) => {
                    req.body.password = hash;
                    db.collection('users').doc(email).set(req.body)
                    .then(data => {
                        res.json({
                            name: req.body.name,
                            email: req.body.email,
                            seller: req.body.seller, 
                        })
                    })
                })
            })
        }
    })
})

//login route
app.get('/login', (req, res) => {
    res.sendFile(path.join(staticPath, "login.html"));
})

app.post('/login', (req, res) => {
    let {email, password} = req.body;

    if(!email.length || !password.length){
        return res.json({'alert': 'fill all the inputs'})
    }

    db.collection('users').doc(email).get()
    .then(user => {
        if(!user.exists){// is email do not exists
            return res.json({'alert': 'log in email does not exists'})
        } else {
            bcrypt.compare(password, user.data().password, (err, result) => {
                if(result){
                   let data = user.data();
                   return res.json({
                       name: data.name,
                       email: data.email, 
                       seller: data.seller,
                   })
                } else {
                    return res.json({'alert': 'password is incorrect'})
                }
            })
        }
    })
})

//seller route
app.get('/seller', (req, res) => {
    res.sendFile(path.join(staticPath, 'seller.html'));
})

app.post('/seller', (req, res) => {
    let {name, about, address, number, tac, legit, email} = req.body;
    if(!name.length || !address.length || !about.length || number.length < 10 || !Number(number)){
        return res.json({'alert': 'some information(s) is/are invalid'});
    } else if(!tac || !legit){
        return res.json({'alert': 'you must agree to our terms and conditions'});
    } else {
        //update usres seller status here.
        db.collection('seller').doc(email).set(req.body)
        .then (data => {
            db.collection('user').doc(email).update({
                seller: true
            }).then(data => {
                res.json(true);
            })
        })
    }
})

app.get('/add-product',(req,res)=>{
    res.sendFile(path.join(staticPath,"addProduct.html"));
})

app.get('/add-product/:id',(req,res)=>{
    res.sendFile(path.join(staticPath,"addProduct.html"));
})

app.get('/s3url', (req, res) => {
    generateUrl().then(url => res.json(url));
})

app.post('/add-product', (req, res) => {
    let { name, shortDes, des, images, sizes, actualPrice, discount, sellPrice, stock, tags, tac, email, draft, id } = req.body;

    if(!draft){
        if(!name.length){
            return res.json({'alert': 'enter product name'});
        }else if (shortDes.length >100 || shortDes.length < 10 ){
            return res.json({'alert': 'short description must be between 10 to 100 letters long'});
        }else if (!des.length){
            return res.json({'alert': 'enter detail description about the product'});
        }else if (!images.length){
            return res.json({'alert': 'upload atleast one product image'});
        }else if (!sizes.length){
            return res.json({'alert': 'select at least one size'});
        }else if (!actualPrice.length || !discount.length || !sellPrice.length){
            return res.json({'alert': 'you must add pricings'});
        }else if(stock < 20){
            return res.json({'alert': 'you should have at least 20 items in stock'});
        }else if(!tags.length){
            return res.json({'alert': 'enter few tags to help ranking your product in search'});
        }else if(!tac){
            return res.json({'alert': 'you must agree to our terms and conditions'});
        }
    }

    let docName = id == undefined ? `${name.toLowerCase()}-${Math.floor(Math.random() * 5000)}` : id;
    db.collection('product').doc(docName).set(req.body)
    .then(data => {
        res.json({'product': name});
    })
    .catch(err => {
        return res.json({'alert': 'some error occured. Try again'});
    })
})

app.post('/get-products', (req, res) => {
    let {email, id} = req.body;
    let docRef = id ? db.collection('products').doc(id) : db.collection('products').where('email', '==', email);

    docRef.get()
    .then(products => {
        if(products.empty){
            return res.json('no products');
        }
        let productArr = [];
        if(id){
            return res.json(products.data());
        }else{
            products.forEach(item => {
                let data =item.data();
                data.id = item.id;
                productArr.push(data);
            })
            res.json(productArr)
        }
    })
})

app.post('/delete-product', (req, res) => {
    let { id } = req.body;

    db.collection('products').doc(id).delete()
    .then(data => {
        res.json('success');
    }).catch(err => {
        res.json('err');
    })
})

app.get('/products/:id', (req, res) => {
    res.sendFile("product.html", { root : "public" })
})

app.get('/search/:key', (req, res) => {
    res.sendFile("search.html", { root : "public" })
})

// review routes
app.post('/add-review', (req, res) => {
    let { headline, review, rate, email, product } = req.body;
    
    // form validations
    if(!headline.length || !review.length || rate == 0 || email == null || !product){
        return res.json({'alert':'Fill all the inputs'});
    }

    // storing in Firestore
    let reviews = collection(db, "reviews");
    let docName = `review-${email}-${product}`;

    setDoc(doc(reviews, docName), req.body)
    .then(data => {
        return res.json('review')
    }).catch(err => {
        console.log(err)
        res.json({'alert': 'some err occured'})
    });
})

app.post('/get-reviews', (req, res) => {
    let { product, email } = req.body;

    let reviews = collection(db, "reviews");

    getDocs(query(reviews, where("product", "==", product)), limit(4))
    .then(review => {
        let reviewArr = [];

        if(review.empty){
            return res.json(reviewArr);
        }

        let userEmail = false;

        review.forEach((item, i) => {
            let reivewEmail = item.data().email;
            if(reivewEmail == email){
                userEmail = true;
            }
            reviewArr.push(item.data())
        })

        if(!userEmail){
            getDoc(doc(reviews, `review-${email}-${product}`))
            .then(data => reviewArr.push(data.data()))
        }

        return res.json(reviewArr);
    })
})

app.get('/cart', (req, res) => {
    res.sendFile("cart.html", { root : "public" })
})

//404 route
app.get('/404', (req, res) =>{
    res.sendFile(path.join(staticPath, "404.html"));
})

app.use((req, res) =>{
    res.redirect('/404');
})

app.listen(3000, () => {
    console.log('listening on port 3000......');
})
