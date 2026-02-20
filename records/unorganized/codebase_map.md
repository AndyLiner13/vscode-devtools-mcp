# Params

## folderPath
The folderPath param is the folder that the tool should return the map for. Only 1 folder can be set per request.

## recursive
The recursive param is a boolean and would only be used if CoPilot wants the output to include all of the files & subFolders recursively from the folderPath set in that request.

## fileTypes
The fileTypes param is an array that lets CoPilot choose which file types to include in the output. So if CoPilot only wants to see the .ts files in the specified folderPath, it can choose to only see .ts files. This array only allows the following options:

* = all file types (default)

none = only folders. no files.

.* = specified file type(s) using the file's extension in an array (like [".ts", ".md", ".py"], etc.)

## symbols
The symbols param is a boolean that lets CoPilot choose whether or not to include the symbols of each file that is returned.

If fileTypes is set to "none", the symbols param should be ignored.

If the symbols param is set to true, the skeleton of the symbol usages for each file should be included in the output.

The symbols should represent their corresponding position in the hierarchy to reflect how deeply nested each symbol is in the file.

Symbols should only include the name and type/kind of symbol in the output. Not the params/props/body of each symbol.