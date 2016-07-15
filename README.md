# Data Visualisation Server for _Farm_ of Mannabox web site #

## Maintenance  ##
1. Connect to the EC2 instance via SSH. It can be done on the command line / terminal with this command:

        ssh -i mannaFarmView.pem ubuntu@ec2-54-199-164-198.ap-northeast-1.compute.amazonaws.com
   `mannaFarmView.pem` is the _key_ that is used to authenticate the user by the server.

2. Change directory to `FarmView_server`.
        cd FarmView_server

3. Confirm that the server and updating processes exist.

        ps ax | grep nodejs
        ps ax | grep phantomjs
   If `nodejs dvserver.js` and `watch -n 900 phantomjs update.js` appear in the results respectively, nothing is going wrong on the server.

4. If something is missing, that is, one or more of the processes is not alive, type

        nohup nodejs dvserver.js &
   to start the server or

        nohup watch -n 900 phantomjs update.js &
   to make the computer update stored data periodically.

    cf. `nohup` forces the command following that not to be killed even on hang-up(suspend) or executing `exit` command to let the SSH client disconnect from the server.

    Command following `watch` is executed periodically. `-n 900` means that the command will be run at every 900 seconds.

    `&` attached at the last seems to let the user escape from the UI where they add processes as _nohup_.

5. After everything is done, disconnect from the server.
    exit