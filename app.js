var hash = require('crypto').Hash,
    http = require('http'),
    fs = require('fs'),
    query = require('querystring'),
    $ = require('jquery'),
    
    express = require('express'),
    jqtpl = require('jqtpl'),
    io = require('socket.io');


//calculate hash
var md5 = function(data){
    var h = new hash('md5');
    h.update(data);
    return h.digest('hex');
}

//data sent on new page loads
var loaddata = '';


var app = express.createServer();

app.set('view engine', 'html');

app.register('.html', require('jqtpl'));

app.set('views', __dirname+'/views');

app.use('/resources', express.static(__dirname+'/resources'));

//start the server listening
app.listen(7997); 
console.log('Hacker News Live listening on port 8080');

//routes
app.get('/', function(req, res){

    res.render('index', {locals: loaddata} );

});



//socket.io config
var socket = io.listen(app);
socket.on('connection', function(client){

    client.on('message', function(data){});
    client.on('disconnect', function(){
     	console.log('disconnect');
    })

});

var insta = {

    //template cache
    template:'',

    init: function(){

        //cache template
        fs.readFile(__dirname+'/views/customindex.html', function(err, data){

            insta.template = data;

        });

        setInterval(function(){
            insta.get();
        },60000);

        insta.get();

    },

    render: function(obj){

        console.log('Updated HN');

        loaddata = obj;

        var html = [];
        for(var index in obj){
            var localtmpl = insta.template + '';

            localtmpl = localtmpl.replace('${index}', index);

            for(var key in obj[index]){

                while(localtmpl.indexOf('${'+key+'}') > -1){
                    localtmpl = localtmpl.replace( '${'+key+'}', obj[index][key] );
                }

            }
            
            html.push( localtmpl );
        }

        socket.broadcast( html.join('') );

    },

    get: function(){


        //store hacker news page data
        var hn = {}

        var options = {
            host: 'news.ycombinator.com',
            port: 80,
            path: '/'
        }

        http.get(options, function(res){

            var body = [];
            res.on('data', function(data){
                body.push(data);
            })
            .on('end', function(){

                var doc = $(body.join('')),
                    obj = {},
                    dictkey = '';


                //find td elements containing stories
                var parse = doc.find('table tr:nth-child(3) table tr>td');
                parse.each(function(i){

                    var index = i%5;    

                    if( index === 0){

                        obj = {
                            position:0, 
                            title:'',
                            url:'',
                            src:'',
                            user:'',
                            score:0,
                            age:'', 
                            commentcount:0,
                            voteid:'',
                            votedir:'',
                            votewhence:''
                        }

                        var el = $(this).html().match(/\d+/gi);

                        //store item's position
                        obj.position = (el? el[0] : null);

                    }

                    if( index === 1 ){
                        
                        var href = query.parse( $(this).find('a').attr('href').replace('vote?','') );
                        
                        obj.voteid = href.for;
                        obj.votedir = href.dir;
                        obj.votewhence = href.whence;

                    }

                    if( index === 2 ){

                        var el = $(this).find('a');
                        dictkey = md5( el.attr('href') );

                        obj.title = el.html();
                        obj.url = el.attr('href');
                        
                        obj.src = $(this).find('span').text().match(/[a-zA-Z0-9\-\.]+/gi);
                        obj.src = !obj.src? '' : '('+obj.src[0]+')';

                    }

                    if( index === 4 ){

                        obj.score = $(this).find('span').html().match(/\d+/gi)[0];
                        obj.user = $(this).find('a').eq(0).html();

                        var comment = $(this).find('a').eq(1).html();
                        if( comment === 'discuss' ) comment = '0 comments';
                        obj.commentcount = (comment !== null ? comment.match(/\d+/gi)[0] : null );

                        obj.age = $(this).text().match(/\d+\s(?:minutes|minute|hours|hour|days|day)/gi)[0];
                        
                        //store entry in dictkey
                        hn[dictkey] = obj;

                    }

                });

                
                insta.render(hn);


            });

        });

    }
    
}

insta.init();
