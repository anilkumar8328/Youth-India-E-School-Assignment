const express=require('express')
const app=express()
const fs = require('fs').promises;
const path = require('path');
const cookieParser = require('cookie-parser')
const process = require('process');
const {google} = require('googleapis');
const {authenticate} = require('@google-cloud/local-auth');


const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

const AUTHORIZATION = path.join(process.cwd(), 'Authorization.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');


async function retrieveCredentialsIfExist() {
  try {
    const content = await fs.readFile(AUTHORIZATION);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.access_token,
  });
  console.log(payload)
  await fs.writeFile(AUTHORIZATION, payload);
}

app.use(cookieParser());

app.get('/rest/v1/calendar/init/',
async(req,res) => {
  try{
    let client = await retrieveCredentialsIfExist();
    if (client) {
        res.send({data : "logged in sucessfully,Hit the second api!!"})
        return 
    }
    client = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
      await saveCredentials(client);
    }
    res.cookie("userData", client);
    res.send({data : "logged in sucessfully,Hit the second api!!"})
    return
  }catch(err){
    res.send(err)
  }
}
);

app.get('/rest/v1/calendar/redirect', async (req,res) => {
  let details = await retrieveCredentialsIfExist()
  console.log("auth",auth)
  console.log("cookie",req.cookies);
  const calendar = google.calendar({version: 'v3', details});
  const rest = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  });
  const events = rest.data.items;
  if (!events || events.length === 0) {
    res.send('No Events Are found.');
    return;
  }
  let output=[]
  events.map((event, i) => {
    const start = event.start.dateTime || event.start.date;
    output.push(`${start} - ${event.summary}`);
  });
  res.send({data:output})
}
)


const PORT=process.env.PORT||4000
app.listen(PORT,()=>{
  console.log(`server connected at port ${PORT}`)
})