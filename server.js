try {

   var WebSocket = require('ws');
   var http = require("http");
   var port = 20002;
   var wss;

   var reply = function(ws, id, data) {
      ws.send(JSON.stringify({id:id, md:JSON.stringify(data)}));
   }




   authenticatedUserSockets = [];
   let playerdatabase = {};
   let lastid = 0;
   let _server = {};

   //Broadcasts a chat message
   _server.broadcastMessage = function(msg) {
      authenticatedUserSockets.forEach(_ws => {
         try {
            reply(_ws, "Chat", {
               msg:msg
            });
         }catch(e) {

         }
      });
   }

   //Sends packets to everyone, except its sender
   _server.broadcastPacketFromSender = function(wsSender, packetname, data) {
      authenticatedUserSockets.forEach(_ws => {
         if(_ws!=wsSender) {
            reply( _ws, packetname, data );
         }
      });
   }

   //Sends packets to everyone
   _server.broadcastPacket = function(packetname, data) {
      authenticatedUserSockets.forEach(_ws => {
         reply( _ws, packetname, data );
      });
   }

   //Exporting a function to start the server
   module.exports = function() {
      //Shutting down the old websocket server
      if(wss) {
         console.log("Shutting down previous websocket server");
         wss.shutDown();
      }

      //Creating a new websocket server
      wss = new WebSocket.Server({ port: port },()=>{
         console.log('server started')
      });

      //Handling new connections
      wss.on('connection', function connection(ws) {
         let userdata = {};
         userdata.username = "N/A";
         userdata.authenticated = false;
         userdata.saveddata = {};
         userdata.id = ++lastid;
         let hasSentInitialHash = false;
         let hasReceivedBlockData = false;
         playerdatabase[userdata.id] = userdata;

         ws.on('message', (data) => {
            switch(ws.binaryType) {
               case "nodebuffer":
                  /*try { 
                     let d = (JSON.parse(data));
                     switch(d.state) {
                        case messageids.creds:
                           let key = d.skey;
                           console.log("Authenticating key: " + key);
                           //TODO: Authenticate the session key, and get the username associated with it
      
                           // will be executed asynchronously
                           http.get(`http://community.homesteadgamedevelopment.com:20001/`+encodeURIComponent(`{"action":"get","key":"${key}"}`), (response) => {
                              let chunks_of_data = [];
      
                              response.on('data', (fragments) => {
                                 chunks_of_data.push(fragments);
                              });
                              
                              response.on('end', () => {
                                 let response_body = Buffer.concat(chunks_of_data);
                                 // response body
                                 let response_message = response_body.toString();
      
                                 try {
                                    let response = JSON.parse(response_message);
                                    if(response.success) {
                                       //It has passed!
                                       userdata.authenticated = true;
                                       userdata.username = response.username;
                                       console.log("Authenticated user")
                                       console.log("Username: " + response.username);
                                       authenticatedUserSockets.push(ws);
                                       reply(ws, "AcceptedSessionKey", {playerInventory:"",playerStats:"",playerName:""});
                                    }else{
                                       //It has failed
                                       reply(ws, "FailedSessionKey", {});
                                    }
                                 }catch(e) {
                                    console.error(e);
                                 }
                              });
      
                              response.on('error', (error) => {
                                 console.log(error);
                              });
                           });
                        break;
      
                        case messageids.chat:
                           if(userdata.authenticated) {
                              
                              Events.fire("onPlayerChat", userdata.username, d.msg);
                              if(Events.storage["onPlayerChat"].data["sendMessage"]) {
                                 _server.broadcastMessage(Events.storage["onPlayerChat"].data["message"]);
                              }
                           }
                        break;
      
                        case messageids.RequestChunk:
                           let ch = worldengine.GetChunk(d.x, d.y, d.z)//chunk.blocks
      
                           reply(ws, "RequestChunk", {
                              chunk:ch.network
                           });
      
                        case messageids.RequestInitialTextureHash:
                           if(hasSentInitialHash==false) {
                              console.log("Sending initial texture hash to " + userdata.username);
                              reply(
                                 ws, "ReceiveInitialHash", assetstreamer.initial_message
                              );
                              hasSentInitialHash = true;
                           }
                        break;
      
                        case messageids.RequestHashList:
                           console.log("Sending hash list to " + userdata.username + " / " + JSON.stringify(assetstreamer.network_hashes).length);
                           reply(
                              ws, "ReceiveHashList", {"hash_list":(assetstreamer.network_hashes)}
                           );
                        break;
      
                        case messageids.RequestCacheFile:
                           
                           let hashedImageFromIndex = assetstreamer.network_hashes[d.i];
                           let imgname = hashedImageFromIndex.name;
                           let img = assetstreamer.network_images[imgname];
                           console.log("Sending " + imgname + " to " + userdata.username);
      
                           reply(ws, "ReceiveCacheImage", {img:img});
                        break;
      
                        case messageids.RequestBlockData:
                           if(hasReceivedBlockData==false) {//Quick debounce
                              hasReceivedBlockData = true;
                              //console.log(blockdb.data);
                              //console.log(JSON.toString(blockdb.data));
                              reply(ws, "ReceiveBlockData", blockdb.data);
                           }
                        break;
      
                        case messageids.PlayerPlaceBlock:
                           //_server.broadcastPacket("PlayerPlaceBlock", {x:d.x, y:d.y, z:d.z, id:d.id});
                           
                           
                           worldengine.worlds.overworld.SetBlock(Math.floor(d.x), Math.floor(d.z), Math.floor(d.y),d.id);
                           worldengine.worlds.overworld.UpdateChunk(Math.floor(d.x/16),Math.floor(d.z/16),Math.floor(d.y/16))
                           worldengine.worlds.overworld.SaveChunk(Math.floor(d.x/16),Math.floor(d.z/16),Math.floor(d.y/16))
                           _server.broadcastPacket("PlayerPlaceBlock", {x:d.x, y:d.y, z:d.z, id:d.id});
                           /*_server.broadcastPacket("RequestChunk", {
                              chunk:worldengine.GetChunk(Math.floor(d.x/16),Math.floor(d.z/16),Math.floor(d.y/16)).network
                           });*//*
                        break;
      
                        case messageids.PlayerBreakBlock:
      
                           worldengine.worlds.overworld.SetBlock(Math.floor(d.x), Math.floor(d.z), Math.floor(d.y),-1);
                           worldengine.worlds.overworld.UpdateChunk(Math.floor(d.x/16),Math.floor(d.z/16),Math.floor(d.y/16))
                           worldengine.worlds.overworld.SaveChunk(Math.floor(d.x/16),Math.floor(d.z/16),Math.floor(d.y/16))
                           _server.broadcastPacket("PlayerBreakBlock", {x:d.x, y:d.y, z:d.z});
                           /*
                           worldengine.worlds.overworld.SetBlock(Math.floor(d.x), Math.floor(d.z), Math.floor(d.y),-1);
                           worldengine.worlds.overworld.UpdateChunk(Math.floor(d.x/16),Math.floor(d.z/16),Math.floor(d.y/16))
                           .then(function() {
                              console.log("Sending chunk update");
                              reply(ws, "RequestChunk", {
                                 chunk:worldengine.GetChunk(Math.floor(d.x/16),Math.floor(d.z/16),Math.floor(d.y/16)).network
                              });
                           })*//*
                        break;
      
                        case messageids.LogInWorld:
                           _server.broadcastMessage(userdata.username + " has logged in.");
      
                           let pos = {
                              x: 0,
                              y: 200,
                              z: 0
                           }
                           userdata.x = pos.x;
                           userdata.y = pos.y;
                           userdata.z = pos.z;
      
                           reply(
                              ws, "LogInWorld", {
                                 world:"overworld",
                                 x:pos.x,
                                 y:pos.y,
                                 z:pos.z,
                                 chunks:[
                                    //simulateChunk(-1, -1, 0),
                                 ]
                              }
                           );
                           
                           //Sending the player the
                           for(const[key, value] of Object.entries(playerdatabase)) {
                              if(value.id != userdata.id) {//Ignore ourself
                                 reply(
                                    ws, "OtherPlayerLogedIn",
                                    {
                                       name: value.username,
                                       x: value.x,
                                       y: value.y,
                                       z: value.z,
                                       id: value.id
                                    }
                                 );
                              }
                           }
      
                           _server.broadcastPacketFromSender(ws, "OtherPlayerLogedIn", {
                              name: userdata.username,
                              x: pos.x,
                              y: pos.y,
                              z: pos.z,
                              id: userdata.id
                           });
                           
                           Events.fire("onPlayerLogin", userdata.username, ws);
                        break;
      
                        case messageids.UpdatePlayerPosition:
                           _server.broadcastPacketFromSender(ws, "OtherPlayerMove", {
                              x: d.x,
                              y: d.y,
                              z: d.z,
                              id: userdata.id
                           });
                           userdata.x = d.x;
                           userdata.y = d.y;
                           userdata.z = d.z;
                        break;
      
                        default:
                           console.log(`Unhandled state: ${d.state}`);
                        break;
                     //}
                  //}catch(e) {*/
                     try {

                        let binary = [];
                        for(let index=0; index<data.length; index++) {
                           binary[index] = data[index];
                        }
                        

                        let p = bufferReader(binary);
                        let msgid = p.readUShort();
                        console.log("Handling message: " + msgid);
                        let writer = bufferWriter();

                        switch(msgid) {
                           case messageids.server.creds:
                              let key = p.readString();
                              console.log("Handling key: " + key);
                              let encodedData = encodeURIComponent("{\"action\":\"get\",\"key\":\""+key+"\"}");
                              console.log(encodedData);
                              http.get(`http://community.homesteadgamedevelopment.com:20001/`+encodeURIComponent(`{"action":"get","key":"${key}"}`), (response) => {
                                 console.log("one?");
                                 let chunks_of_data = [];
      
                                 response.on('data', (fragments) => {
                                    chunks_of_data.push(fragments);
                                 });
                                 
                                 response.on('end', () => {
                                    let response_body = Buffer.concat(chunks_of_data);
                                    console.log("Authentication message response body: " + response_body);
                                    // response body
                                    let response_message = response_body.toString();
                                    console.log("Authentication message response message: " + response_message);
         
                                    try {
                                       let response = JSON.parse(response_message);
                                       if(response.success) {
                                          //It has passed!
                                          userdata.authenticated = true;
                                          userdata.username = response.username;
                                          console.log("Authenticated user")
                                          console.log("Username: " + response.username);
                                          authenticatedUserSockets.push(ws);

                                          writer.writeInt(messageids.client.AcceptedSessionKey);
                                          writer.writeString(userdata.username);
                                          ws.send(writer.getData());

                                       }else{
                                          //It has failed
                                          writer.writeInt(messageids.client.FailedSessionKey);
                                          ws.send(writer.getData());
                                       }
                                    }catch(e) {
                                       console.error(e);
                                    }
                                 });
         
                                 response.on('error', (error) => {
                                    console.log("AUTHENTICATION HTTP ERROR?: " + error);
                                 });
                              });
                           break;
                        
                           case messageids.server.RequestInitialTextureHash:
                              console.log("Retreiving initial hash message?");
                              if(hasSentInitialHash==false) {
                                 console.log("Sending initial texture hash to " + userdata.username);
                                 //assetstreamer.hash
                                 //assetstreamer.fileCount
                                 /*reply(
                                    ws, "ReceiveInitialHash", assetstreamer.initial_message
                                 );*/
                                 let writer = bufferWriter();
                                 writer.writeInt(messageids.client.ReceiveInitialHash);
                                 writer.writeString(assetstreamer.hash);
                                 writer.writeInt(assetstreamer.fileCount);

                                 ws.send(writer.getData());
                                 hasSentInitialHash = true;
                              }
                           break;

                           case messageids.server.RequestHashList:
                              console.log("Player RequestHashList");
                              
                              writer.writeInt(messageids.client.ReceiveHashList);

                              //Writing the amount of hashes
                              writer.writeInt(assetstreamer.network_hashes.length);
                              //Writing the hashes
                              for(let i = 0; i < assetstreamer.network_hashes.length; i++) {
                                 writer.writeString(assetstreamer.network_hashes[i].name);
                                 writer.writeString(assetstreamer.network_hashes[i].hash);
                              }

                              ws.send(writer.getData());
                              

                              /*
                              console.log("Sending hash list to " + userdata.username + " / " + JSON.stringify(assetstreamer.network_hashes).length);
                              reply(
                                 ws, "ReceiveHashList", {"hash_list":(assetstreamer.network_hashes)}
                              );
                              */
                           break;

                           case messageids.server.RequestCacheFile:
                              let imgIndex = p.readInt();
                              let hashedImageFromIndex = assetstreamer.network_hashes[imgIndex];
                              let imgname = hashedImageFromIndex.name;
                              let img = assetstreamer.network_images[imgname];
                              /*
                              img.network_image.width = img.width;
                              img.network_image.height = img.height;
                              img.network_image.hash = img.hash;
                              img.network_image.name = img.name;
                              img.network_image.data = img.data;
                              */
                              console.log("Sending " + imgname + " to " + userdata.username);
                              
                              //let writer = bufferWriter();
                              writer.writeInt(messageids.client.ReceiveCacheImage);
                              writer.writeInt   (img.width);
                              writer.writeInt   (img.height);
                              writer.writeString(img.hash);
                              writer.writeString(img.name);

                              //Writing the actual image
                              writer.writeString(img.data);

                              ws.send(writer.getData());
         
                              //reply(ws, "ReceiveCacheImage", {img:img});
                           break;

                           case messageids.server.RequestBlockData:
                              if(hasReceivedBlockData==false) {//Quick debounce
                                 hasReceivedBlockData = true;
                                 //console.log(blockdb.data);
                                 //console.log(JSON.toString(blockdb.data));

                                 writer.writeInt(messageids.client.ReceiveBlockData);
                                 writer.writeInt(blockdb.data.blocks.length);
                                 for(let i = 0; i < blockdb.data.blocks.length; i++) {
                                    blockdb.data.blocks[i].writeToStream(writer);
                                 }
                                 ws.send(writer.getData());

                                 //reply(ws, "ReceiveBlockData", blockdb.data);
                              }
                           break;

                           //CONVERT
                           case messageids.server.LogInWorld:
                              _server.broadcastMessage(userdata.username + " has logged in.");
         
                              let pos = {
                                 x: 0,
                                 y: 200,
                                 z: 0
                              }
                              userdata.x = pos.x;
                              userdata.y = pos.y;
                              userdata.z = pos.z;
                              
                              let playerWriter = bufferWriter();
                              playerWriter.writeInt(messageids.client.LogInWorld);
                              playerWriter.writeInt(pos.x);
                              playerWriter.writeInt(pos.y);
                              playerWriter.writeInt(pos.z);
                              ws.send(playerWriter.getData());
                              
                              //Sending the player the
                              for(const[key, value] of Object.entries(playerdatabase)) {
                                 if(value.id != userdata.id) {//Ignore ourself
                                    
                                    let otherPlayerWriter = bufferWriter();
                                    otherPlayerWriter.writeInt(messageids.client.OtherPlayerLogedIn);
                                    otherPlayerWriter.writeString(value.username);
                                    otherPlayerWriter.writeInt(value.x);
                                    otherPlayerWriter.writeInt(value.y);
                                    otherPlayerWriter.writeInt(value.z);
                                    otherPlayerWriter.writeInt(value.id);
                                    ws.send(otherPlayerWriter.getData());

                                 }
                              }
         
                              _server.broadcastPacketFromSender(ws, "OtherPlayerLogedIn", {
                                 name: userdata.username,
                                 x: pos.x,
                                 y: pos.y,
                                 z: pos.z,
                                 id: userdata.id
                              });
                              
                              Events.fire("onPlayerLogin", userdata.username, ws);
                           break;
                           
                           case messageids.server.RequestChunk:
                              let ch = worldengine.GetChunk(p.readInt(), p.readInt(), p.readInt())//chunk.blocks
                              
                              writer.writeInt(messageids.client.RequestChunk);

                              

                              ws.send(writer.getData());
                              /*
                              reply(ws, "RequestChunk", {
                                 chunk:ch.network
                              });
                              */

                           default:
                              console.log("UNHANDLED MESSAGE ID: " + msgid);
                        }
                     }catch(e2) {
                        console.error(e2);
                     }
                  //}
               break;

               case "arraybuffer":
                  console.log("This is binary");
               break;

               default:
                  console.log("Unhandled binary type: " + ws.binaryType);
               break;
            }
            
         });

         ws.onerror = () => {
            console.log(userdata.username + " has logged out");
            Events.fire("onPlayerLogout", userdata.username, ws);
            _server.broadcastMessage(userdata.username + " has logged out");
            _server.broadcastPacket("OtherPlayerLogout", {
               id: userdata.id
            });

            playerdatabase[userdata.id] = null;
            delete playerdatabase[userdata.id];
         }

         ws.onclose = () => {
            console.log(userdata.username + " has logged out");
            Events.fire("onPlayerLogout", userdata.username, ws);
            _server.broadcastMessage(userdata.username + " has logged out");
            _server.broadcastPacket("OtherPlayerLogout", {
               id: userdata.id
            });

            playerdatabase[userdata.id] = null;
            delete playerdatabase[userdata.id];
         }
         
         //Sending data to the client that joins
         setTimeout(function() {
            let writer = bufferWriter();

            //Sending the initial message, to let the client know we are ready to start initializing.
            writer.writeInt(messageids.client.Init);

            ws.send(writer.getData());
         }, 300);
      });

      //Checking for when we start listening
      wss.on('listening',()=>{
         console.log(`listening on ${port}`)
      })
   }
}catch(e) {
   console.error(e);
}

bufferWriter();