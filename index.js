require('dotenv').config()

// Link to the table of contents of the course you want
var target = process.env.TARGET;

// Your login details
var user = {
    email: process.env.EMAIL,
    password: process.env.PASSWORD
}

/*** DAH CODEZ ***/
var ProgressBar = require('progress');
var Nightmare = require('nightmare');
var nightmare = Nightmare({ show: false });

var https = require('https');
var fs = require("fs");


console.log(`This program was written for EDUCATION and PERSONAL USE ONLY
Please be respectful of the original authors' intellectual property

This scraper is open source and licensed under GPLv2 on Github
https://github.com/knyzorg/pluralsight-scraper
`)

console.log("Logging in...")

var numberOfFiles, completed, saveTo, progress = 0;
nightmare
    .goto('https://app.pluralsight.com/id/')
    .insert('#Username', user.email)
    .insert('#Password', user.password)
    .click('#login')
    .wait(1000)
    .goto(target)
    .wait(3000)
    .evaluate(function () {
        var courses = [];
        document.querySelectorAll('a[class^="clipListTitle"').forEach((course) => {
            courses.push({
                name: course.text,
                url: course.href
            })
        })
        return {
            courses: courses.filter((thing) => thing.url),
            title: document.title
        }
    })
    .then(function (module) {
        numberOfFiles = module.courses.length;
        if (!numberOfFiles){
            console.error("Wrong login credentials!")
            process.exit(1)
            return;
        }
        console.log("Logged in!")
        saveTo = module.title.replace(" | Pluralsight", "");
        console.log(`Downloading "${saveTo}" from PluralSight, ${numberOfFiles} videos`)
        progress = new ProgressBar(':current/:total [:bar] :percent :etas', { total: numberOfFiles, callback: terminate })
        var tasks = module.courses.map((course, index) => (
            (callback) => {
                scrape(course, index, callback)
            }
        ))
        require("async.parallellimit")(tasks, 1, function () {
        });
    }).catch((e) => console.log(e))

function scrape(course, index, callback, delay=1500) {
    nightmare.goto(course.url)
        .wait("video")
        .wait(1500)
        .evaluate(() => {
            var src = document.querySelector("video").src
            return src
        })
        .then((result) => {

            if (!result) {
                progress.interrupt("Something went wrong. Retrying...")
                scrape(course, index, callback, delay+500)
                return
            }

            course.src = result
            saveVideo(course, index + 1)
            callback()
        }).catch((e) => console.log(e))
}

function saveVideo(course, number) {
    //console.log(number, course.name);
    if (!fs.existsSync("videos/")) {
        fs.mkdirSync("videos/");
    }
    if (!fs.existsSync("videos/" + saveTo)) {
        fs.mkdirSync("videos/" + saveTo);
    }
    if (fs.existsSync("videos/" + saveTo + "/" + number + ". " + course.name.replace(/[^a-z]/ig, "") + ".webm")) {
        return;
    }
    var file = fs.createWriteStream("videos/" + saveTo + "/" + number + ". " + course.name.replace(/[^a-z]/ig, "") + ".webm");
    var request = https.get(course.src,(response) => {
        progress.tick()
        response.pipe(file);
        completed++;
        if (completed == numberOfFiles) {

        }
    });
}

function terminate() {
    console.log("Operation Completed!")
    process.exit(0)
}
