import React, { Component, useEffect, useState } from 'react';
import './App.css';
import io from "socket.io-client";
import axios from 'axios';
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'

const socket = io.connect('/');


//Create chat functional component to listen to messages with socketio
function Chat(props) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [server, setServer] = useState(props.server);

  //use efect to reset messages on server change
  useEffect(()=>{
    setServer(props.server);
    setMessages([]);
  },[props.server]);

  //use effect to update messages when a message is received
  useEffect(() => {
    socket.on("message", (data) => {
      let temp = messages;
      temp.push({
        username: data.sender,
        text: data.text,
        time: data.sendTime
      });
      setMessages([...temp]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server]);

  //send a message
  const sendData = () => {
    if (text !== "") {
      socket.emit("chat", {msg:text, user: props.username, server: server});
      console.log("server: "+props.server);
      setText("");
    }
  };

  //return html components with massages as an iterable map 
  return (
    <div>
      <div>
        <h2>
          You are connected to {props.server}
        </h2>
      </div>
      <div >
        {messages.map((i) => {
          return (
            <div className="message" key={i.text + i.time}>
              <p>
                {i.text}
                <br></br>
                <span className = 'username'>Sent by: <strong>{i.username}</strong>,&nbsp;&nbsp;&nbsp;</span>
                <span className = 'time'>At: <strong>{i.time}</strong></span>
              </p>
              
            </div>
          );
          
        })}
      </div>
      <div>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              sendData();
            }
          }}
        ></input>
        <button onClick={sendData}>Send</button>
      </div>
    </div>
  );
}



//Component that does everything else, it includes all forms, login data, and server connection options
class Login extends Component {
  constructor(props) {
    super(props);
    this.state = {regName: '',regPswd: '',logName: '',logPswd: '', servName: '', addUserName: '', removeUserName: '', pubServName: '', dmUser:'', changeServerName: '',isPub: true, logged: false, servers: null, currentServer: null, currentAdmin: null};

    this.handleChange = this.handleChange.bind(this);
    this.handleCheck = this.handleCheck.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
    this.sendRegister = this.sendRegister.bind(this);
    this.sendLogin = this.sendLogin.bind(this);
    this.createServer = this.createServer.bind(this);
    this.addUser = this.addUser.bind(this);
    this.removeUser = this.removeUser.bind(this);
    this.joinPublic = this.joinPublic.bind(this);
    this.directMessage = this.directMessage.bind(this);
    this.changeCurrentServerName = this.changeCurrentServerName.bind(this);
  }

  //event handlers that update form fields and state variables so the html rerenders
  handleChange(event) {
    this.setState({[event.target.name]: event.target.value});

  }
  handleCheck(event) {
    this.setState({isPub: !this.state.isPub});
  }
  handleLogout(event) {
    window.location.reload();
  }

  //on send registration use axios to send a message so express backend, connect to correct room with socket and reload the dom
  sendRegister(event){
    event.preventDefault();

    if (this.state.regName !== "" && this.state.regPswd !== "") {
      axios.post(`register`, {username:this.state.regName, password:this.state.regPswd})
      .then(res => {
        this.setState({logged: res.data.valid, servers: res.data.servers, logName: this.state.regName, currentServer: res.data.servers[0].servername, currentAdmin: res.data.admin});
        let thisUsername = this.state.logName;
        let initServer = this.state.currentServer;
        socket.emit("joinRoom", {username: thisUsername, servername: initServer});
      });
    } else {
      alert("Please enter a username and password");
      window.location.reload();
    }
  }

  //on send login use axios to send a message so express backend, connect to correct room with socket and reload the dom
  sendLogin(event){
    event.preventDefault();

    if (this.state.logName !== "" && this.state.logPswd !== "") {
      axios.post(`login`, {username:this.state.logName, password:this.state.logPswd})
      .then(res => {
        this.setState({logged: res.data.valid, servers: res.data.servers, currentServer: res.data.servers[0].servername, currentAdmin: res.data.admin});
        let thisUsername = this.state.logName;
        let initServer = this.state.currentServer;
        socket.emit("joinRoom", {username: thisUsername, servername: initServer});
      });
    } else {
      alert("Please enter a username and password");
      window.location.reload();
    }
    
  }

  //on dropdown click this manages a users connected rooms and rerenders the html
  resetCurrentServer(event, selectedServer, selectedServerAdmin){   
    socket.emit("reJoinRoom", {username: this.state.logName, servername: selectedServer, currentAdmin: selectedServerAdmin ,oldservername: this.state.currentServer});
    this.setState({currentServer : selectedServer, currentAdmin : selectedServerAdmin});
  }

  //create a serer by sending info to express backend and rerendering the html
  createServer(event){
    event.preventDefault();
    console.log(this.state.isPub);
    if(this.state.servName !== ""){
      axios.post(`createServer`, {servername:this.state.servName, isPublic:this.state.isPub, admin:this.state.logName})
      .then(res => {
        if(res.data.valid){
          this.setState({logged: res.data.valid, servers: res.data.servers, currentServer: res.data.newServer, currentAdmin: this.state.logName});
          let thisUsername = this.state.logName;
          let initServer = this.state.currentServer;
          socket.emit("joinRoom", {username: thisUsername, servername: initServer});
        }
      });
    } else {
      alert("Please enter a server name");
    }
  }

  //admin controls to add a user to a private server
  addUser(event){
    event.preventDefault();
    if(this.state.addUserName !== ""){
      axios.post(`addUser`, {servername:this.state.currentServer, newUser:this.state.addUserName, serverAdmin: this.state.currentAdmin})
      .then(res => {
        if(res.data.valid){
          alert("This user was added");
        }
        else{
          alert("This user does not exist or is already in this server");
        }
      });
    } else {
      alert("Please enter a user name");
    }
  }

  //admin controls to remove a user from a private server
  removeUser(event){
    event.preventDefault();

    if(this.state.removeUserName !== ""){
      axios.post(`removeUser`, {servername:this.state.currentServer, removeUser:this.state.removeUserName, serverAdmin: this.state.currentAdmin})
      .then(res => {
        if(res.data.valid){
          alert("This user was removed");
        }
        else{
          alert("This user does not exist or is not in this server");
        }
      });
    } else {
      alert("Please enter a user name");
    }

  }

  //send a request to express to check if server is a valid public server, if so it adds the user and rerenders the html
  joinPublic(event){
    event.preventDefault();

    if(this.state.pubServName !== ""){
      axios.post(`joinPub`, {servername:this.state.pubServName,  username:this.state.logName})
      .then(res => {
        if(res.data.valid){
          this.setState({servers: res.data.servers, currentServer: this.state.pubServName, currentAdmin: 'PUBLIC'});
          let thisUsername = this.state.logName;
          let initServer = this.state.currentServer;
          socket.emit("joinRoom", {username: thisUsername, servername: initServer});
        }
        else{
          alert("You failed to join this server, it may not exist or may be private");
        }
      });
    } else {
      alert("Please enter a server name");
    }
  }

  //start or join a direct message
  directMessage(event){
    event.preventDefault();

    if(this.state.dmUser !== ""){
      axios.post(`startDm`, {userFrom:this.state.logName, userTo:this.state.dmUser})
      .then(res => {
        if(res.data.valid){
          if(res.data.servers!=="null"){
            this.setState({servers: res.data.servers, currentServer: res.data.newServer, currentAdmin: 'DMADMIN'});
            let thisUsername = this.state.logName;
            let initServer = this.state.currentServer;
            socket.emit("joinRoom", {username: thisUsername, servername: initServer});
          }
          else{
            this.setState({currentServer: res.data.newServer, currentAdmin: 'DMADMIN'});
            let thisUsername = this.state.logName;
            let initServer = this.state.currentServer;
            socket.emit("joinRoom", {username: thisUsername, servername: initServer});
          }

        }
        else {
          alert("This user does not exist");
        }
      });
    } else {
      alert("Please enter a user name");
    }
  }

  //admin controls to change a server name
  changeCurrentServerName(event){
    event.preventDefault();
    if(this.state.changeServerName !== ""){
      axios.post(`changeServerName`, {user:this.state.logName, oldServer:this.state.currentServer, newServer:this.state.changeServerName})
      .then(res => {
        if(res.data.valid){
          if(res.data.servers!=="null"){
            this.setState({servers: res.data.servers, currentServer: this.state.changeServerName});
            let thisUsername = this.state.logName;
            let initServer = this.state.currentServer;
            socket.emit("joinRoom", {username: thisUsername, servername: initServer});
          }
        }
      });
    } else {
      alert("Please enter a new server name");
    }
  }

  //renders the html
  render() {
    //create variables for conditional rendering
    let servers = this.state.servers;
    let children = null;
    let youAreAdmin = (this.state.currentAdmin === this.state.logName); 
    let adminChild0 = null;
    let adminChild1 = null;
    let adminChild2 = null;
    let adminChild3 = null;
    console.log(this.state.servers);

    //this creates a list of childre for the dropdown menu based on what servers a user is a member of
    if(servers!=null){
      children = servers.map((val) => {
        console.log('here');
        return (
          <Dropdown.Item key={val.servername} className='server_drop' href="#" onClick = {(event) => this.resetCurrentServer(event, val.servername, val.serverAdmin)}> {val.servername}               </Dropdown.Item>
        )
      });

      //this creates the admin controls if the user is an admin of a current server
      if(youAreAdmin){
        adminChild0 = <strong>Admin Controls:</strong>;

        adminChild1 = 
          <form onSubmit={this.addUser}>
            <label>
              Add user to server:
              <input type="text"  name="addUserName" value={this.state.addUserName} onChange={this.handleChange} />
            </label>
            <input type="submit" value="Submit" />
          </form>;

        adminChild2 = 
          <form onSubmit={this.removeUser}>
            <label>
              Remove user from server:
              <input type="text"  name="removeUserName" value={this.state.removeUserName} onChange={this.handleChange} />
            </label>
            <input type="submit" value="Submit" />
          </form>;

        adminChild3 = 
        <form onSubmit={this.changeCurrentServerName}>
          <label>
            Change current server name:
            <input type="text"  name="changeServerName" value={this.state.changeServerName} onChange={this.handleChange} />
          </label>
          <input type="submit" value="Submit" />
        </form>;

      }

    }

    //renders based on a switch statement, if logged it will render chat and more options, otherwise it will just be the login page
    return (
      <div className="homepage">
      {this.state.logged 
        ? 
        <React.Fragment>
        <p> 
          Currently logged in as: <strong>{this.state.logName}          </strong>
          <button type='button' onClick = {this.handleLogout}> Log Out </button>
        </p>
        
        <DropdownButton id="server_dropdown" title="View Your Servers" drop = 'right'>
          {children}
        </DropdownButton>
        <strong>Create new server:</strong>
        <form onSubmit={this.createServer}>
          <label>
            New Server Name
            <input type="text"  name="servName" value={this.state.servName} onChange={this.handleChange} />
          </label>
          <label>
            Make public?
            <input type="checkbox" name="isPub" checked={this.state.isPub} onChange={this.handleCheck} />
          </label>
          <input type="submit" value="Submit" />
        </form>
        <strong>Join public server:</strong>
        <form onSubmit={this.joinPublic}>
          <label>
            Public Server Name
            <input type="text"  name="pubServName" value={this.state.pubServName} onChange={this.handleChange} />
          </label>
          <input type="submit" value="Submit" />
        </form>
        <strong>Start or join a direct message:</strong>
        <form onSubmit={this.directMessage}>
          <label>
            User name
            <input type="text"  name="dmUser" value={this.state.dmUser} onChange={this.handleChange} />
          </label>
          <input type="submit" value="Submit" />
        </form>
        {adminChild0}
        {adminChild1}
        {adminChild2}
        {adminChild3}
        
        <Chat 
          username = {this.state.logName}
          server = {this.state.currentServer}
        />
        </React.Fragment>
        
        : 
        <React.Fragment>
        <strong>Register</strong>
            <form onSubmit={this.sendRegister}>
              <label>
                Name:
                <input type="text"  name="regName" value={this.state.regName} onChange={this.handleChange} />
              </label>
              <label>
                Password:
                <input type="text" name="regPswd" value={this.state.regPswd} onChange={this.handleChange} />
              </label>
              <input type="submit" value="Submit" />
            </form>
            <strong>Login</strong>
            <form onSubmit={this.sendLogin}>
              <label>
                Name:
                <input type="text"  name="logName" value={this.state.logName} onChange={this.handleChange} />
              </label>
              <label>
                Password:
                <input type="text" name="logPswd" value={this.state.logPswd} onChange={this.handleChange} />
              </label>
              <input type="submit" value="Submit" />
            </form>
        </React.Fragment>}  
    </div>
    );
}
}


class App extends Component {
state = {
    data: null
  };

  componentDidMount() {
    this.callBackendAPI()
      .then(res => this.setState({ data: res.express }))
      .catch(err => console.log(err));
  }
    // fetching the GET route from the Express server which matches the GET route from server.js
  callBackendAPI = async () => {
    const response = await fetch('/express_backend');
    const body = await response.json();

    if (response.status !== 200) {
      throw Error(body.message) 
    }
    return body;
  };

  render() {
      return (
        <div className="game">
          <div className="game-board">
            <Login />
          </div>
        </div>
      );
    }
}

export default App;