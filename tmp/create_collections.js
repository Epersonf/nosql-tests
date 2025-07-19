var db = require("@arangodb").db; 
try { db._drop("profiles"); } catch(e) {} 
try { db._drop("relations"); } catch(e) {} 
db._create("profiles"); 
db._createEdgeCollection("relations", {keyOptions: { type: "autoincrement", offset: 0 }}); 
