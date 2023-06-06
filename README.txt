    The Flight API supports four main services, with accordance to
the four possible routes it has. The services are as follows:

 - /delayedCount: returns the number of flights that got delayed.

 - /flightCount: returns a number of flights.
                 responds to two optional headers:
                    1) type = [all/inbound/outbound] - the query will count only the
                        specified type of flights.
                    2) country - the query will count only flights from/to this
                        specific country.
 
 - /mostPopularDestination: returns the most popular city according to current flights.

 - /getaway: returns two flights that will take you on a short trip from Israel and
             back.
             takes an optional header, 'duration', which contains the number of hours
             between the flights. The default value is 1 hour.