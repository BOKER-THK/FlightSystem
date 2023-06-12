Flight API / Itay Boker
    
The Flight API supports four main services, with accordance to
the four possible routes it has. The services are as follows:

 - /delayedCount: Returns the number of flights that got delayed.

 - /flightCount: Returns a number of flights.
                 Responds to two optional headers:
                    1) type = [all/inbound/outbound] - The query will count only the
                        specified type of flights. default value: 'all'.
                    2) country - The query will count only flights from/to this
                        specific country.
 
 - /mostPopularDestination: Returns the most popular city according to current flights.

 - /getaway: Returns two flights that will take you on a short trip from Israel and
             back.
             Takes an optional header, 'duration', which indicates the number of hours
             between the flights. default value: 1 hour.


Docker activation:
    
    To create a docker image, the Dockerfile uses an initial layer of node ver. 18,
    then copy the files, install npm (and the libraries we're going to use) and expose
    the port specified, port 8080. finally the image will execute the code and run the
    server with a CMD command.

    To build the image, use the CLI to get to the project directory, and then
    use this command:

        docker build -t flight_api .

    (including the dot - it specifies the location of the Dockerfile, which is here)

    The command will create the image in the docker server. Next, run the following
    command in the CLI to create a container using the image:

        docker run --name flight_api_c -p 8080:8080 -d flight_api
    
    the flags used specify the name of the container (flightAPI_c), the port that will
    be linked to the container port and the container port (both 8080, in this case),
    and finally the detached flag, which makes the container run in the background.

    From that point on, the command used to stop the container is:

        docker stop flight_api_c
    
    and the command used to restart it is:

        docker start flight_api_c
