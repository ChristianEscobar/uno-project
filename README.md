# uno-project

## This version is a work in progress, some functionality may not function properly.  Check back for updates.

### Game Rules
The basic object of the game is for a Player to get rid of all the cards in their hand by matching cards on top of the discard pile.  For a complete set of rules, visit [UNO Rules](https://www.unorules.com/).

### How To Run
Follow the steps below for getting the game up and running on your local machine.

1. Clone this repository
2. Setup the uno_seq_db MySQL database
3. Run the Sequelize seeders files

### Database
The application requires a MySQL database.  Using your GUI of choice, create a MySQL database with the following name:  ***uno_db_seq***

### Sequelize Seeders
There are a set of tables that must be pre-populated with data in order for the game to function.  Sequelize-cli is used to run seeder files that will populate the tables.

Follow the steps below to run the Sequelize seeder scripts:
```
npm install  
cd ../uno-project/app 
sequelize db:seed:all
```
