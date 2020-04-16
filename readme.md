# Web4Realty App

Server application for handling tracking of visitors to client websites.

## Getting Started

These instructions will get the application running on a fresh CentOS Linux server.

### Prerequisites

#### Root

You will need root access for the installation and setup of this app.

#### Node.js v6 and NPM

Node.js is what runs our application. The app has been tested compatible up to v6.

```
curl --silent --location https://rpm.nodesource.com/setup_6.x | sudo bash -
```

See https://nodejs.org/en/download/package-manager/ for more details.

#### PM2

PM2 is our production cluster and uptime manager. It handles smooth restarts, logging, etc.
Install via:
```
npm install -g pm2@latest
```

You can also setup remote monitoring for pm2, including viewing logs from a website or getting notifications for
downtime. For more info, see https://github.com/Unitech/pm2

#### Git

Github is our Version Control System. We will use it to clone our source code to the server.

Install git via:
```
sudo yum install git
```

### Installation

Now that all the dependencies are installed, you can login with your NON-root user. You will still need root.

#### Setup

We want to configure pm2 to work across restarts, so run on NON-root user:
```
# Run this as NON-root
pm2 startup
```
And then execute the offered command as root. The command should look something like this, but use the offered one!
```
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u w4rapp --hp /home/w4rapp
```

We will also need to internally forward port 80 to our listening port (for example 3000 or 8080). We do this by updating
the iptables as root.

```
sudo iptables -A PREROUTING -t nat -p tcp --dport 80 -j REDIRECT --to-port 3000
```

Then we need to save and reload

```
service iptables save
service iptables reload
```

#### Server code

You will need Git credentials with access to the web4realty Github organization. Navigate to the home directory for the
NON-root user (usually w4rapp user for this app).
```
cd ~
git clone https://github.com/web4realty/real-find.git
```

ALTERNATIVELY, if you want a different directory name than real-find. The rest of the tutorial will assume real-find.
```
git clone https://github.com/web4realty/real-find.git YOUR_DIR_HERE
```
This will ask for your username and password for Github. The repo is private so you'll need access.

Finally, we navigate to our app directory and install our module dependencies with NPM.

```
cd real-find
npm install
```

#### Configuration

Now that the application is downloaded, you need to configure the database and host information. Navigate to the
installation directory (e.g. real-find), and make a new config.json file.
```
cd real-find
cp config/config_sample.json config/config.json
```

Now you'll need to enter the correct info for the database and host. The host is probably "http://web4realty.com/". Use
your favorite method. For example, you can edit the file with vim:
```
vim config/config.json
```

To make changes with vim, press the INSERT key. Then to save them, hit the ESCAPE key, and type :wq, then ENTER.

#### Launch Application

Now we're finally ready to get our app going! Make sure we're in our app directory in NON-root, and tell pm2 to start
our app. We'll name the process "w4rapp" and tell PM2 to launch 2 instances in cluster mode. (You can change this number
if you want.) Then we will tell pm2 to save our process list so that it will automatically start with the server.

```
# Run this as NON-root
cd ~/real-find
pm2 start app.js --name="w4rapp" -i 2
pm2 save
```

You're done! You can check that everything is working correctly with
```
pm2 logs w4rapp
```

#### Installing Updates

If everything is already configured and running successfully and you just need to update the code, simply pull from
Github, update module dependencies with NPM, and tell pm2 to restart. You will need that Github login again.

```
cd ~/real-find
git pull
npm install
pm2 restart w4rapp
```

If you are using the remote monitoring, you'll probably also want to update pm2 while you're at it.

```
pm2 update
```

Easy update, zero downtime!