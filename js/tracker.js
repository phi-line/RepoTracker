var urls = ['phi-line/RepoTracker'];

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
        repo.data = json
        getStats(url, true, function (json) {
          repo.stats = json
          getCommits(url, function (json) {
            repo.commits = json
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
  return c1.commit.author.time > c2.commit.author.time;
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
        if (!latestCommit || timeGreater(repoLatest, latestCommit))
          latestCommit = repoLatest;
    })
})
Promise.all(requests).then(() => {
  lines.update(totalLines)
  commits.update(totalCommits)
  updateCommitCard(latestCommit)
})

window.setInterval(function(){
    totalLines = 0;
    totalCommits = 0;
    let requests = repoArr.map((repo, i, repoArr) => {
      return getRepo(repo.url).then(newRepo => {
          totalLines += getNumLines(newRepo.stats);
          totalCommits += getNumCommits(repo.stats);
          repoLatest = getLatestCommit(repo);
          if (!latestCommit || timeGreater(repoLatest, latestCommit))
            latestCommit = repoLatest;

          if (! _.isEqual(repoArr[i], newRepo))
            repoArr[i] = newRepo;
      })
    })
    Promise.all(requests).then(() => {
      lines.update(totalLines)
      commits.update(totalCommits)
      updateCommitCard(latestCommit);
    })
}, 10000);
