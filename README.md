# Meta-robots
Checks Performance, Canonicals and Robots tags with JavaScript turned ON and OFF

input file name: Adresy.csv must be included inside the directory, where you run the files.

output file: Czasy.txt will be created inside the run directory.

(Names will be changed in the future)

All the data is stored in Metrics object, which is constructed like that:

Metrics = {
    url: "",
    performance: {
      TTFB: "",
      trueTTFB: "",
    },
    indexability: {
      withoutJavascript: "",
      withJavaScript: "",
    },    
    canonicalization: {
      withoutJavaScript: "",
      withJavaScript: "",
    },
    numberOfTags: {
      canonicalsWithoutJavaScirpt: "",
      canonicalsWithJavaScirpt: "",
      robotsWithoutJavaScript: "",
      robotsWithJavaScriptS: ""
    }
  }
