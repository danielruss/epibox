console.log('epibox.js loaded')

/*
epibox=async function(){
    console.log(`epibox ini at ${Date()}`)
    epibox.readParms()
    //epibox.getOauth()
    epibox.login()
}
*/

epibox={ // initiatization onload at episphere.github.io/epibox
    ini:async function(){
        console.log(`epibox ini at ${Date()}`)
        epibox.readParms()
        epibox.login()
    }
}

epibox.login=async function(){
    epibox.getOauth()
    // look for token infoin localStorage
    if(localStorage.epiboxtoken){epibox.oauth.token=JSON.parse(localStorage.epiboxtoken)} // remove if localStorage persistence undesirable
    if(epibox.parms.code){ // dance first step taken
        epibox.oauth.token = await (await fetch('https://api.box.com/oauth2/token',{
            method:"POST",
            body:`grant_type=authorization_code&code=${epibox.parms.code}&client_id=${epibox.oauth.client_id}&client_secret=${epibox.oauth.client_secret}`
        })).json()
        epibox.oauth.token.initiated_at=epibox.oauth.token.created_at=Date.now()
        epibox.oauth.token.client_id=epibox.oauth.client_id
        epibox.oauth.token.client_secret=epibox.oauth.client_secret
    }
    if(!epibox.oauth.token){ // start dance
        location.href=`https://account.box.com/api/oauth2/authorize?client_id=${epibox.oauth.client_id}&response_type=code&redirect_uri=${location.origin+location.pathname}`
    }else{ // clean url code
        if(location.search.length>2){
            localStorage.epiboxtoken=JSON.stringify(epibox.oauth.token)
            location.href=location.origin+location.pathname
        }else{
            //delete localStorage.epiboxtoken
            //alert('logged in')
            epibox.msg(`> logged in session last updated ${new Date(epibox.oauth.token.created_at)}`,'green')
        }
    }
            
}

epibox.observableToken=function(token={}){
    if(!epibox.oauth){epibox.oauth={}}
    epibox.oauth.token=token
    // default client info
    let client_id_value = 'rq2ab1uuvrzp86oa0yehgjibqf7arxy5'
    let client_secret_value = 'NItekKKQEqQBgRsU0qnEBVY3zP0nvieh'
    // update client info from token, if available
    if(token.client_id){ // update client identification values in notebook elements client_id and client_secret
        let client_id_value=token.client_id||client_id_value
        let client_secret_value=token.client_secret||client_secret_value
    }else{
        epibox.oauth.token.initiated_at=epibox.oauth.token.created_at=Date.now()
    }
    epibox.oauth.token.client_id=epibox.oauth.client_id=client_id_value
    epibox.oauth.token.client_secret=epibox.oauth.client_secret=client_secret_value
    localStorage.epiboxtoken=JSON.stringify(epibox.oauth.token)
    return epibox.oauth.token
}
epibox.activeDivHtml=function(){
    setTimeout(epibox.checkToken,2000)
    return `<div id="box_client">
        <h3>epiBox</h3>
        client_id:<input id="client_id" value="${epibox.oauth.client_id}"><br>
        client_secret:<input id="client_secret" value="${epibox.oauth.client_secret}" type="password">
        <pre id="epibox_msg" style="color:green;background-color:rgb(234,250,241)">active session ...</pre>
        <button onclick="epibox.checkToken()">Check</button>
        <button onclick="epibox.refreshToken()">Refresh</button>
        <button onclick="(async function(){await epibox.getUser();epibox.msg(JSON.stringify(epibox.oauth.user,null,3))})()">User</button>
        <button onclick="epibox.logout()">Logout</button>
        <button onclick="epibox.logout();setTimeout(epibox.checkToken,3000)">Restart</button>
    </div>`
}
epibox.loginObservable=async function(){
    epibox.readParms()
    epibox.loginObservableDiv=document.createElement('div')
    if(epibox.parms.code){ // POST dance with code
        epibox.observableToken()
        let token=await (await fetch('https://api.box.com/oauth2/token',{
            method:"POST",
            body:`grant_type=authorization_code&code=${epibox.parms.code}&client_id=${epibox.oauth.client_id}&client_secret=${epibox.oauth.client_secret}`
        })).json()
        epibox.observableToken(token)
        epibox.msg(`> oauth2 bearer token recorded in localStorage,\n epibox is now available to your observable notebooks`,'green')
        epibox.loginObservableDiv.innerHTML=epibox.activeDivHtml()
    }else{
        if(localStorage.epiboxtoken){ // pre-existing credentials found
            epibox.observableToken(JSON.parse(localStorage.epiboxtoken))
            epibox.loginObservableDiv.innerHTML=epibox.activeDivHtml()
        }else{
            epibox.observableToken()
            epibox.loginObservableDiv.innerHTML=`<h3>epiBox</h3>
            <a href="https://account.box.com/api/oauth2/authorize?client_id=${epibox.oauth.client_id}&response_type=code&redirect_uri=https://observablehq.com/@episphere/epibox" style="font-size:large;color:blue;background-color:yellow">&nbsp;Login Box&nbsp;</a>`
        }
    }
    return epibox.loginObservableDiv
}
// <button id="loginBox" onclick="epibox.loginObservable()">Login Box</button>

epibox.logout=async function(){
    let res = fetch('https://api.box.com/oauth2/revoke',{
        method:"POST",
        mode:"no-cors",
        body:`client_id=${epibox.oauth.client_id}&client_secret=${epibox.oauth.client_secret}&token=${epibox.oauth.token.access_token}`
    }).then(function(){
        localStorage.removeItem('epiboxtoken')
        delete epibox.oauth
        epibox.msg('> logged out of session, please make sure all epibox applications are closed','red')
    })
    return res
}

epibox.refreshToken=async function(){
    setTimeout(epibox.checkToken,3000)
    epibox.msg('refreshing token ...')
    let token = await (await fetch('https://api.box.com/oauth2/token',{
        method:"POST",
        body:`grant_type=refresh_token&refresh_token=${epibox.oauth.token.refresh_token}&client_id=${epibox.oauth.client_id}&client_secret=${epibox.oauth.client_secret}`
    })).json()
    token.created_at=Date.now()
    token.initiated_at=epibox.oauth.token.initiated_at
    token.client_id=epibox.oauth.client_id
    token.client_secret=epibox.oauth.client_secret
    epibox.oauth.token=token
    localStorage.epiboxtoken=JSON.stringify(epibox.oauth.token)
    let msg = `> session refreshed at ${new Date(epibox.oauth.token.created_at)}`
    if(token.error){
        msg = `> ${token.error} caused by ${token.error_description}`
        epibox.msg(msg,'red')
    }else{epibox.msg(msg,'green')}
    return msg
}

epibox.getOauth=function(uri=location.origin){
    //console.log(`oauth for ${location.origin}`)
    switch(uri){
        case 'http://localhost:8000':
            epibox.oauth={
                client_id:'52zad6jrv5v52mn1hfy1vsjtr9jn5o1w',
                client_secret:'2rHTqzJumz8s9bAjmKMV83WHX1ooN4kT'
            }
            break
        case 'https://episphere.github.io':
            epibox.oauth={
                client_id:'1n44fu5yu1l547f2n2fgcw7vhps7kvuw',
                client_secret:'2ZYzmHXGyzBcjZ9d1Ttsc1d258LiGGVd'
            }
            break
        default:
            epibox.msg(`> no auth found for ${location.origin}`,'red')
            //Error(`no auth found for ${location.origin}`)
    }
    return epibox.oauth
}

epibox.checkToken= async function(){ // check token, refresh if needed
    if(!epibox.oauth){ // this is being used from a non epbox context
        let token=undefined
        if(localStorage.epiboxtoken){
            token = JSON.parse(localStorage.epiboxtoken)
        }     
        if(!token){
            let newUrl=document.baseURI
            if(document.baseURI.match(/[\#\?]/g)){newUrl=document.baseURI.slice(0,document.baseURI.indexOf(document.baseURI.match(/[\#\?]/g)[0]))}
            epibox.msg(`> you don't have an active epibox session, \n<a href="${newUrl}?newSession=${Math.random().toString().slice(2)}" style="color:blue;background-color:yellow;font-size:large">&nbsp;start new session&nbsp;</a>.`,'red')
        }else{
            if(token.refresh_token){
                epibox.oauth={
                    client_id:token.client_id,
                    client_secret:token.client_secret,
                    token:token
                }
                if(Date.now()-(epibox.oauth.token.created_at+epibox.oauth.token.expires_in*1000-10000)>0){ // refresh at 10secs before expiration
                    await epibox.refreshToken()
                }
            }else{
                epibox.msg('> refresh token missing, internet access disrupted, retry or restart session','red')
            } 
        }
    }
    if(epibox.oauth.token.refresh_token){
        epibox.oauth.token.initiated_at=epibox.oauth.token.initiated_at||epibox.oauth.token.created_at
        epibox.msg(`> oauth session checked at ${Date()},\n initiated at ${new Date(epibox.oauth.token.initiated_at)},\n last refreshed at ${new Date(epibox.oauth.token.created_at)}.`)
        if(Date.now()-(epibox.oauth.token.created_at+epibox.oauth.token.expires_in*1000-10000)>0){ // refresh at 10secs before expiration
            await epibox.refreshToken()
        }
    }else{
        epibox.msg('> refresh token missing, please restart session','red')
    }
}

epibox.readParms=function(str=location.search){ // by default reads search only, for hash as well one could do (location.hash+location.search)
    str=str.replace(/[\?\#]/g,'&').replace(/^\&/,'')
    //epibox.parms=JSON.parse(localStorage.epibox||'{}')
    epibox.parms={}
    str.split('&').forEach(aa=>{
        aa = aa.split('=')
        epibox.parms[aa[0]]=aa[1]
    })
    //localStorage.epibox=JSON.stringify(epibox.parms)
}

epibox.msg=function(hm,color="blue",dt=1){ // default is as fast as possible
    let msg = document.getElementById('epibox_msg')
    if(msg){
        msg.style.color=color
        msg.innerHTML=''
        if(epibox.msg.t){clearInterval(epibox.msg.t)} // interrupt previous message if not completed
        let i=0
        epibox.msg.t=setInterval(_=>{
            //msg.innerHTML+=hm[i]
            msg.innerHTML=hm.slice(0,i)
            i++
            if(i>hm.length){clearInterval(epibox.msg.t)}
        },dt)
    }else{
        console.log(hm)
    }
}

epibox.get=async function(url='https://api.box.com/2.0/users/me'){
    return await fetch(url,{
        method:'GET',
        headers: {
            'Authorization': 'Bearer '+epibox.oauth.token.access_token
        }
    })
}

epibox.getJSON=async function(url){
    return (await epibox.get()).json()
}

epibox.getUser=async function(){ //await epibox.getUser()
    epibox.oauth.user=epibox.oauth.user||(await epibox.getJSON())
    return epibox.oauth.user
}

if(typeof(define)!="undefined"){
    define(epibox)
}