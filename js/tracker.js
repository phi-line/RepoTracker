var urls = ['apg400/word_extractor_ML',
            'phi-line/RepoTracker',
            'koji1234/OwlHackathon2018',
            'weisscoding/FoothillSchedulizer',
            'edbasurto/Foothill-Hackathon-2017'];

function getStats(url, stats=false, callback) {
  let requri = 'https://api.github.com/repos/' + url +
                  (stats ? '/stats/contributors' : '');

  requestJSON(requri, function(json) {
    if(json.message == 'Not Found' || url == '') {
      console.log('No Repo Found');
    }
    callback(json);
  });
}

function getCommits(url, callback) {
  let requri = 'https://api.github.com/repos/' + url + '/commits';

  requestJSON(requri, function(json) {
    if(json.message == 'Not Found' || url == '') {
      console.log('No Repo Found');
    }
    callback(json);
  });
}

function requestJSON(url, callback) {
  $.ajax({
    url: url,
    complete: function(xhr) {
      callback.call(null, xhr.responseJSON);
    }
  });
}

var Repo = class {
  constructor(url, data=null, stats=null, commits=null) {
    this.url = url
    this.data = data
    this.stats = stats
    this.commits = commits
  }
};

getRepo = function(url) {
    return new Promise(function(resolve, reject) {
      var repo = new Repo(url);
      getStats(url, null, function (json) {
        if (json) repo.data = json
        getStats(url, true, function (json) {
          if (json) repo.stats = json
          getCommits(url, function (json) {
            if (json) repo.commits = json
            if (repo.data && repo.stats && repo.commits)
              resolve(repo)
            else {
              reject(repo)
            }
          })
        })
      })
  })
}

getNumLines = function(stats) {
  var totalAdditions = 0;
  var totalDeletions = 0;

  for(author in stats) {
    for (day in stats[author].weeks) {
      totalAdditions += stats[author].weeks[day].a;
      totalDeletions += stats[author].weeks[day].d;
    }
  }
  return totalAdditions - totalDeletions;
}

getNumCommits = function(stats) {
  var totalCommits = 0;

  for(author in stats) {
    for (day in stats[author].weeks) {
      totalCommits += stats[author].weeks[day].c;
    }
  }
  return totalCommits;
}

getLatestCommit = function(repo) {
  return repo.commits[0];
}

timeGreater = function (c1, c2) {
  return c1.commit.author.date > c2.commit.author.date;
}

updateCommitCard = function (commit) {
  $('#commit-name').html(commit.commit.author.name);
  $('#commit-username').html(commit.author.login);
  $('#commit-image').attr("src",commit.author.avatar_url);
  $('#commit-date').html(commit.author.date);
  $('#commit-message').html(commit.commit.message);
}

lines = new Odometer({
  el: document.querySelector('#lines'),
  value: 0,
  format: ',ddd',
  duration: 2500,
  theme: 'default'
});

commits = new Odometer({
  el: document.querySelector('#commits'),
  value: 0,
  format: ',ddd',
  duration: 2500,
  theme: 'default'
});

var dataPoints = [];
var chart = new CanvasJS.Chart("chartContainer", {
	animationEnabled: true,
  backgroundColor: null,
	theme: "dark1",
	data: [{
		type: "column",
		yValueFormatString: "#,### Lines",
		dataPoints: dataPoints
	}]
});
chart.render();

var totalLines = 0;
var totalCommits = 0;
var latestCommit;
var repoArr = []

let requests = urls.map((url) => {
    return getRepo(url).then(repo => {
        repoArr.push(repo);
        totalLines += getNumLines(repo.stats);
        totalCommits += getNumCommits(repo.stats);
        repoLatest = getLatestCommit(repo);

        dataPoints.push({
          y: getNumLines(repo.stats),
          label: String(repo.data.name)
        });

        if (dataPoints.length > 5) {
          dataPoints.shift();
        }

        if (!latestCommit || timeGreater(repoLatest, latestCommit))
          latestCommit = repoLatest;
    })
})
Promise.all(requests).then(() => {
  lines.update(totalLines)
  commits.update(totalCommits)
  updateCommitCard(latestCommit)
  chart.render();
})

window.setInterval(function(){
    totalLines = 0;
    totalCommits = 0;
    dataPoints = [];
    let requests = repoArr.map((repo, i, repoArr) => {
      return getRepo(repo.url).then(newRepo => {
          repoArr[i] = newRepo;
          totalLines += getNumLines(newRepo.stats);
          totalCommits += getNumCommits(newRepo.stats);

          dataPoints.push({
            x: newRepo.data.name,
            y: getNumLines(newRepo.stats)
          });

          if (dataPoints.length > 5) {
            dataPoints.shift();
          }

          repoLatest = getLatestCommit(newRepo);
          if (!latestCommit || timeGreater(repoLatest, latestCommit))
            latestCommit = repoLatest;
      })
    })
    Promise.all(requests).then(() => {
      lines.update(totalLines)
      commits.update(totalCommits)
      updateCommitCard(latestCommit);
      chart.render();
    })

    chart.render();
}, 10000);
