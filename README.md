# Mumika

Mumika is a customize image item search project

# Build

* Install the dependencies

  `npm install`

* Run the project

  `npm run start`

* Pack the project to App

  `npm run pack`

# Configuration

There are 3 main components to run the program.

* config.json
  
    config.json contains the main information of how to present and the manipulate option for the data. User need to provide the following properties in the file.
    * **dataURL**: (String) The path of data.json
  
    * **objectTemplate**: (Object) An template object for the item in data.json ( can be null since current version don't have relative function for it ) 
  
    * **visible**: (Object) Describe what properties in each item of data.json user want to display. The value is Boolean type. True is that property is exist in every item. False is if that property exist in the item then display.
  
    * **tag**: (Object) Each property is associated with a string array. The property name indicates the type of those tags in the array.\
    E.G.
    `"tag": {  
        "Time": ["Day", "Night"],  
        "Place": ["Indoor", "Outside"]  
    }`

    * **searchProperty**: (Array&lt;String&gt;) Contains the properties that what text search will go through each item in data.json.

    * **sortList**: (Array&lt;String&gt;) Contains the property that user would like to use for sort.
*  data.json
    Describe the detail for each item.

   * **itemList**: (Array&lt;Object&gt;) Each object need to have the following properties.  
     *  id: (Int) The ID for the item.
     *  tag: (array&lt;String&gt;) The tags of the item.

     Optional property:
     
     * imagePath: (String) Indicates the item's image path.

*  image file
    
    For each item in data.json there's a correspond image. The dafault path for the image is (the folder of data.json)/img/(item ID).jpg if the imagePath property doesn't exist in the item.