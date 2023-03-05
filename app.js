const express = require('express');
const { auth, requiresAuth } = require('express-openid-connect');
const fs = require("fs");
const mysql = require("mysql")
const app = express();
const { engine } = require('express-handlebars');
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));

const config = {
  authRequired: false,
  auth0Logout: true,
  baseURL: 'http://localhost:3000/',
  clientID: 'ybNmAYLHeBIzUj2vEgiiLYYOKKkAzyef',
  issuerBaseURL: 'https://dev-1py4vrana10f87ty.us.auth0.com/',
  secret: '66b93abbb2dbb192c9ff02782b8dcacc6e6ad9adec366f33bc04e0a6c56a9f67'
};

app.use(auth(config));
app.use(express.static(__dirname + '/public'));

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Blu3R0ck3t!',
  database: 'nfcApp'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL server: ' + err.stack);
    return;
  }

  console.log('Connected to MySQL server with threadId: ' + connection.threadId);
});

app.set('view engine', 'handlebars')
app.engine('handlebars',  engine({
  layoutsDir: __dirname + '/views/layouts'
}));
app.use(express.static('views'));


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/src/index.html');
});

app.get('/home', requiresAuth(), (req, res) => {
  let content;
  let owner = JSON.stringify(req.oidc.user.sub).replaceAll('"', '');
  console.log(owner);
  connection.query('SELECT redir, name, id FROM tags WHERE owner=?', owner, (error, results, fields) => {
    
    if (error) {
      res.render("response", {layout: 'index', text: 'Error Loading Tags, Refreshing', User: JSON.stringify(req.oidc.user.given_name).replaceAll('"', "")})
      return;
    }
    content = results;
    if (content === null) {
      res.render("userTable", {layout: 'index', User: JSON.stringify(req.oidc.user.given_name).replaceAll('"', "")})
      console.log(content);
    } 
    console.log(content);
    res.render("userTable", {layout: 'index', nfcTag: content, User: JSON.stringify(req.oidc.user.given_name).replaceAll('"', "")});
  });    
});

app.get("/register/:id", requiresAuth(), (req, res) => {
  res.render("registrationForm", {layout: 'index', id: req.params.id, User: JSON.stringify(req.oidc.user.given_name).replaceAll('"', "")});
})

app.get('/tag/:id', function (req, res) {
  console.log('test1');
  connection.query('SELECT redir FROM tags WHERE id=?', req.params.id, (error, results, fields) => {
    
    if (error) {
      res.send("Error")
      return;
    }
    let content = results[0].redir;
    if (content === null) {
      res.render("tagNotReg", {layout: 'index', id: req.params.id, User: ""})
      console.log('test2');
    } else {
      res.redirect(content);
    }  
  });
});

app.get('/edit/:id', requiresAuth(), function (req, res) {
  connection.query('SELECT name, redir FROM tags WHERE id=?', req.params.id, (error, results, fields) => {
    if (error) {
      res.render("response", {layout: 'index', text: 'Error: Tag Does Not Exist', User: JSON.stringify(req.oidc.user.given_name).replaceAll('"', "")})
      return;
    }
    let content = results[0];
    if (content !== JSON.stringify(req.oidc.user.sub).replaceAll('"', '')) {
      console.log(content.name + " " + content.redir);
      res.render("edit", {layout: 'index', name: content.name, url: content.redir, id: req.params.id, User: JSON.stringify(req.oidc.user.given_name).replaceAll('"', "")})
      return;
    }   
  });
});

app.post('/edit/:id/submit-form', requiresAuth(), function(req, res) {
  const tagName = req.body.name;
  const tagId = req.params.id;
  const tagRedir = req.body.redirect;
  const user_id = JSON.stringify(req.oidc.user.sub).replaceAll('"', '');
  console.log(tagId + tagName + tagRedir + user_id);
  connection.query('SELECT owner FROM tags WHERE id=?', req.params.id, (error, results, fields) => {
    if (error) {
      res.render("response", {layout: 'index', text: 'Error: Tag Does Not Exist', User: JSON.stringify(req.oidc.user.given_name).replaceAll('"', "")})
      return;
    }
    let content = results[0].owner;
    if (content !== user_id) {
      res.render("response", {layout: 'index', text: 'Error: You Do Not Have Permission To Edit This Tag', User: JSON.stringify(req.oidc.user.given_name).replaceAll('"', "")})
      return;
    }   
  });
  connection.query(`UPDATE tags SET redir='${tagRedir}', name='${tagName}', last_modified=CURRENT_TIMESTAMP WHERE id='${tagId}'`, (error, results, fields) => {
    if (error) {
      res.render("response", {layout: 'index', text: 'Error: Process Failed', User: JSON.stringify(req.oidc.user.given_name).replaceAll('"', "")})
      return;
    } else {
      res.render("response", {layout: 'index', text: 'Tag Successfully Edited', User: JSON.stringify(req.oidc.user.given_name).replaceAll('"', "")})
    }
      
  });
  
});

app.post('/register/:id/submit-form', requiresAuth(), function(req, res) {
  const tagName = req.body.name;
  const tagId = req.params.id;
  const tagRedir = req.body.redirect;
  const user_id = JSON.stringify(req.oidc.user.sub).replaceAll('"', '');
  console.log(tagId + tagName + tagRedir + user_id);
  connection.query('SELECT owner FROM tags WHERE id=?', req.params.id, (error, results, fields) => {
    if (error) {
      res.render("response", {layout: 'index', text: 'Error: Tag Does Not Exist', User: JSON.stringify(req.oidc.user.given_name).replaceAll('"', "")})
      return;
    }
    let content = results[0].owner;
    if (content !== null) {
      res.render("response", {layout: 'index', text: 'Error: Tag Is already Registered', User: JSON.stringify(req.oidc.user.given_name).replaceAll('"', "")})
      return;
    }   
  });
  connection.query(`UPDATE tags SET redir='${tagRedir}', owner='${user_id}', name='${tagName}', date_added=CURRENT_TIMESTAMP, last_modified=CURRENT_TIMESTAMP WHERE id='${tagId}'`, (error, results, fields) => {
    if (error) {
      res.render("response", {layout: 'index', text: 'Error: Incorrect Id', User: JSON.stringify(req.oidc.user.given_name).replaceAll('"', "")})
      return;
    } else {
      res.render("response", {layout: 'index', text: 'Tag Successfully Registered', User: JSON.stringify(req.oidc.user.given_name).replaceAll('"', "")})
    }
      
  });
  
});

app.listen(3000, () => {
  console.log('Example app listening on port 3000!');
})