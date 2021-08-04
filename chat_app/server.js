const express = require('express'); 
const socketio = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const port = process.env.PORT || 5000; 

const app = express(); 
app.use(express());
app.use(cors());
const server = app.listen(port, console.log('Server is running'));

const io = socketio(server);

//socket io manage connections
io.on("connection", (socket)=>{

  //on join room initially send a message to other users in the room that a new user ha
  socket.on("joinRoom", function(data) {
    socket.join(data.servername);
    socket.emit("message", {
      text: data.username + " has joined " + data.servername,
      sender: data.username,
      sendTime: getTimeString()
    });
    socket.broadcast.to(data.servername).emit("message", {
      text: data.username + " has joined " + data.servername,
      sender: data.username,
      sendTime: getTimeString()
    });
  });

  socket.on("reJoinRoom", function(data) {
    
    socket.leave(data.oldservername);
    socket.join(data.servername);  
    socket.emit("message", {
      text: data.username + " has joined " + data.servername,
      sender: data.username,
      sendTime: getTimeString()
    });
    socket.broadcast.to(data.servername).emit("message", {
      text: data.username + " has joined " + data.servername,
      sender: data.username,
      sendTime: getTimeString()
    });
  });

  socket.on("chat", function(data) {
    io.to(data.server).emit("message", {
      text: data.msg,
      sender: data.user,
      sendTime: getTimeString()
    });
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/express_backend', (req, res) => { //Line 9
  res.send({ express: 'Edit msg from express' }); //Line 10
}); //Line 11

// https://stackoverflow.com/questions/12703098/how-to-get-a-json-file-in-express-js-and-display-in-view
function readJsonFileSync(filename){
  if (typeof (encoding) == 'undefined'){
      encoding = 'utf8';
  }
  var file = fs.readFileSync(filename, encoding);
  return JSON.parse(file);
}

function userInFile(username, password, filename){
  let JSON = readJsonFileSync(filename);
  for (var index = 0; index < JSON.length; ++index) {
    var user = JSON[index];
    if(user.username == username && user.password == password){
      return [true, user.serversIn];
    }
  }
  return [false, null];
}

function validUsername(username, password ,filename){
  let JSONOBJ = readJsonFileSync(filename);
  for (var index = 0; index < JSONOBJ.length; ++index) {
    var user = JSONOBJ[index];
    if(user.username == username){
      return [false, null];
    }
  }
  JSONOBJ.push({username: username, password: password, serversIn: [{"servername" : "global", "serverAdmin":"PUBLIC"}]});
  fs.writeFile('users.json', JSON.stringify(JSONOBJ), 'utf8', (err) => {
    if (err)
      console.log(err);
    }
  );
  return [true, [{"servername" : "global"}]];
}

function addUserToServer(username, servername, filename){
  let JSONOBJ = readJsonFileSync(filename);
  for (let index = 0; index < JSONOBJ.length; ++index) {
    let server = JSONOBJ[index];
    if(server.servername == servername){
      for (let userIndex = 0; userIndex < server.users.length; ++userIndex){
        let user = server.users[userIndex];
        if(user.username == username){
          return false;
        }
      }
      JSONOBJ[index].users.push({username: username});
      fs.writeFile('servers.json', JSON.stringify(JSONOBJ), 'utf8', (err) => {
        if (err)
          console.log(err);
        }
      );
      return true;
    }
  }
  return false;
}

function getTimeString(){
  // https://stackoverflow.com/Questions/3605214/javascript-add-leading-zeroes-to-date
  const MyDate = new Date();
  const todayString = 
  ('0' + MyDate.getHours()).slice(-2) + ':'
  + ('0' + (MyDate.getMinutes())).slice(-2) + ':'
  + ('0' + (MyDate.getSeconds())).slice(-2);
  return todayString;
}

function validServerName(username, servername, filename, isPublic){
  let realAdmin = "PUBLIC";
  if(!isPublic){
    realAdmin = username;
  }
  let JSONOBJ = readJsonFileSync(filename);
  for (let index = 0; index < JSONOBJ.length; ++index) {
    let server = JSONOBJ[index];
    if(server.servername == servername){
      return false;
    }
  }
  JSONOBJ.push({servername: servername, admin:realAdmin, public:isPublic, users:[{username:username}]});
  fs.writeFile('servers.json', JSON.stringify(JSONOBJ), 'utf8', (err) => {
    if (err)
      console.log(err);
    }
  );
  let JSONOBJ2 = readJsonFileSync('users.json');
  for (var index = 0; index < JSONOBJ2.length; ++index) {
    var user = JSONOBJ2[index];
    if(user.username == username){
      JSONOBJ2[index].serversIn.push({servername:servername, serverAdmin:realAdmin});
      fs.writeFile('users.json', JSON.stringify(JSONOBJ2), 'utf8', (err) => {
        if (err)
          console.log(err);
        }
      );
      return [true, JSONOBJ2[index].serversIn]
    }
  }
  return false;
}

function addUserToServerTwoWay(username, servername, serverAdmin){
  let JSONOBJ = readJsonFileSync('servers.json');
  for (let index = 0; index < JSONOBJ.length; ++index) {
    let server = JSONOBJ[index];
    if(server.servername == servername){
      for (let userIndex = 0; userIndex < server.users.length; ++userIndex){
        let user = server.users[userIndex];
        if(user.username == username){
          return false;
        }
      }
      JSONOBJ[index].users.push({username: username});
      
      let JSONOBJ2 = readJsonFileSync('users.json');
      for (let index2 = 0; index2 < JSONOBJ2.length; ++index2) {
        let user = JSONOBJ2[index2];
        if(user.username == username){
          JSONOBJ2[index2].serversIn.push({servername:servername, serverAdmin:serverAdmin});
          fs.writeFile('servers.json', JSON.stringify(JSONOBJ), 'utf8', (err) => {
            if (err)
              console.log(err);
            }
          );
          fs.writeFile('users.json', JSON.stringify(JSONOBJ2), 'utf8', (err) => {
            if (err)
              console.log(err);
            }
          );
          return true;
        }
      }
    }
  }
  return false;
}

function removeUserToServerTwoWay(username, servername, serverAdmin){
  let JSONOBJ = readJsonFileSync('servers.json');
  for (let index = 0; index < JSONOBJ.length; ++index) {
    let server = JSONOBJ[index];
    if(server.servername == servername){
      for (let userIndex = 0; userIndex < server.users.length; ++userIndex){
        let user = server.users[userIndex];
        if(user.username == username){
          JSONOBJ[index].users.splice(userIndex, 1);

          let JSONOBJ2 = readJsonFileSync('users.json');
          for (let index2 = 0; index2 < JSONOBJ2.length; ++index2) {
            let user = JSONOBJ2[index2];
            if(user.username == username){
              for (let userindex2 = 0; userindex2 < user.serversIn.length; ++userindex2) {
                if(user.serversIn[userindex2].servername == servername){
                  JSONOBJ2[index2].serversIn.splice(userindex2, 1);
                  fs.writeFile('servers.json', JSON.stringify(JSONOBJ), 'utf8', (err) => {
                    if (err)
                      console.log(err);
                    }
                  );
                  fs.writeFile('users.json', JSON.stringify(JSONOBJ2), 'utf8', (err) => {
                    if (err)
                      console.log(err);
                    }
                  );
                  return true;
                }
              }
              
              
            }
          }
        }
      }
      
      
      
    }
  }
  return false;
}

function addUserToPublicServerTwoWay(username, servername){
  let JSONOBJ = readJsonFileSync('servers.json');
  for (let index = 0; index < JSONOBJ.length; ++index) {
    let server = JSONOBJ[index];
    if(server.servername == servername && server.public == true){
      for (let userIndex = 0; userIndex < server.users.length; ++userIndex){
        let user = server.users[userIndex];
        if(user.username == username){
          return false;
        }
      }
      JSONOBJ[index].users.push({username: username});
      
      let JSONOBJ2 = readJsonFileSync('users.json');
      for (let index2 = 0; index2 < JSONOBJ2.length; ++index2) {
        let user = JSONOBJ2[index2];
        if(user.username == username){
          JSONOBJ2[index2].serversIn.push({servername:servername, serverAdmin:'PUBLIC'});
          fs.writeFile('servers.json', JSON.stringify(JSONOBJ), 'utf8', (err) => {
            if (err)
              console.log(err);
            }
          );
          fs.writeFile('users.json', JSON.stringify(JSONOBJ2), 'utf8', (err) => {
            if (err)
              console.log(err);
            }
          );
          return [true, JSONOBJ2[index2].serversIn];
        }
      }
    }
  }
  return [false, JSONOBJ2[index2].serversIn];;
}

function calledDM(userFrom, userTo){
  const newServerName = userFrom + '-' + userTo;
  const newServerNameFlip = userTo + '-' + userFrom;
  let JSONOBJ = readJsonFileSync('servers.json');
  for (let index = 0; index < JSONOBJ.length; ++index) {
    let server = JSONOBJ[index];
    if(server.servername == newServerName){
      return [true, newServerName, 'null'];
    }
    if(server.servername == newServerNameFlip){
      return [true, newServerNameFlip, 'null'];
    }
  }
  let JSONOBJ2 = readJsonFileSync('users.json');
  for (var index = 0; index < JSONOBJ2.length; ++index) {
    var user = JSONOBJ2[index];
    if(user.username == userTo){
      JSONOBJ2[index].serversIn.push({servername:newServerName, serverAdmin:'DMADMIN'});
      for (var indexFrom = 0; indexFrom < JSONOBJ2.length; ++indexFrom) {
        var userFromIter = JSONOBJ2[indexFrom];
        if(userFromIter.username == userFrom){
          JSONOBJ2[indexFrom].serversIn.push({servername:newServerName, serverAdmin:'DMADMIN'});
          fs.writeFile('users.json', JSON.stringify(JSONOBJ2), 'utf8', (err) => {
            if (err)
              console.log(err);
            }
          );
          
          JSONOBJ.push({servername: newServerName, admin:'DMADMIN', public:false, users:[{username:userFrom}, {username:userTo}]});
          fs.writeFile('servers.json', JSON.stringify(JSONOBJ), 'utf8', (err) => {
            if (err)
              console.log(err);
            }
          );
          return [true, newServerName ,JSONOBJ2[indexFrom].serversIn];
        }
      }  
    }
  }
  
  return [false, null, 'null'];
}

function renameServer(userName, oldName, newName){
  let JSONOBJ = readJsonFileSync('servers.json');
  let thisUserServers = "null";
  for (let index = 0; index < JSONOBJ.length; ++index) {
    let server = JSONOBJ[index];
    if(server.servername === oldName){
      JSONOBJ.splice(index, 1);
      JSONOBJ.push({servername:newName, admin:server.admin, public:server.public, users:server.users});
      let JSONOBJ2 = readJsonFileSync('users.json');
      for (let indexUsers = 0; indexUsers < JSONOBJ2.length; ++indexUsers) {
        let user = JSONOBJ2[indexUsers];
        for (let indexUsersServers = 0; indexUsersServers < user.serversIn.length; ++indexUsersServers){
          if (user.serversIn[indexUsersServers].servername == oldName){
            let oldAdmin = (user.serversIn[indexUsersServers].serverAdmin);
            JSONOBJ2[indexUsers].serversIn.splice(indexUsersServers,1);
            JSONOBJ2[indexUsers].serversIn.push({servername:newName, serverAdmin: oldAdmin});
          }
        }
        if(userName === user.username){
          thisUserServers = JSONOBJ2[indexUsers].serversIn;
        }
      }
      fs.writeFile('users.json', JSON.stringify(JSONOBJ2), 'utf8', (err) => {
        if (err)
          console.log(err);
        }
      );
      fs.writeFile('servers.json', JSON.stringify(JSONOBJ), 'utf8', (err) => {
        if (err)
          console.log(err);
        }
      );
      return [true, thisUserServers];
    }
  }
  return [false, "null"];
}

app.post('/login', function(req, res) {
  const [validLogin, serverList] = userInFile(req.body.username, req.body.password, 'users.json');
  res.send({valid:validLogin, servers:serverList, admin:'PUBLIC'});
  
});

app.post('/register', function(req, res) {
  let [isValidUsername, serverList] = validUsername(req.body.username, req.body.password, 'users.json');
  let added = addUserToServer(req.body.username, "global", 'servers.json');
  res.send( {valid:isValidUsername, servers:serverList, admin:'PUBLIC'});
});

app.post('/createServer', function(req, res) {
  let [valid, serverList] = validServerName(req.body.admin, req.body.servername, 'servers.json', req.body.isPublic)
  res.send( {valid:valid, servers:serverList, newServer:req.body.servername} );
});

app.post('/addUser', function(req, res) {
  let addedUser = addUserToServerTwoWay(req.body.newUser, req.body.servername, req.body.serverAdmin)
  res.send( {valid:addedUser} );
});

app.post('/removeUser', function(req, res) {
  let removedUser = removeUserToServerTwoWay(req.body.removeUser, req.body.servername, req.body.serverAdmin)
  res.send( {valid:removedUser} );
});

app.post('/joinPub', function(req, res) {
  let [addedPub, newServList] = addUserToPublicServerTwoWay(req.body.username, req.body.servername)
  res.send( {valid:addedPub, servers:newServList} );
});

app.post('/startDM', function(req, res) {
  let [dmStarted, newServerName, newServList] = calledDM(req.body.userFrom, req.body.userTo)
  res.send( {valid:dmStarted, newServer: newServerName, servers:newServList} );
});

app.post('/changeServerName', function(req, res) {
  let [dmStarted, newServList] = renameServer(req.body.user, req.body.oldServer, req.body.newServer)
  res.send( {valid:dmStarted, servers:newServList} );
});