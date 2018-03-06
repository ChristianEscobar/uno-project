const express = require("express");
const methodOverride = require("method-override");
const bodyParser = require("body-parser");
const path = require("path");

// Express and Port
const app = express();
const port = process.env.PORT || 3000;

// Requiring our models for syncing
//const db = require("./models");

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.text());
app.use(bodyParser.json({ type: "application/vnd.api+json" }));

// Override with POST having ?_method=DELETE
app.use(methodOverride("_method"));

// Set Handlebars.
//const exphbs = require("express-handlebars");
//app.engine("handlebars", exphbs({ defaultLayout: "main" }));
//app.set("view engine", "handlebars");

// Routes
//app.use("/", routes);

// Syncing our sequelize models and then starting our Express app
/*
db.sequelize.sync({force: true})
.then(() => {
	app.listen(port, () => {
		console.log("Server started, listening on port " + port);
	});
}).catch((error) => {
	console.error(error);
});
*/
app.listen(port, () => {
	console.log("Server started, listening on port " + port);
});

