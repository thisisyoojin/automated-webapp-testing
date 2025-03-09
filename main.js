import { runAllPostmanTests } from "./utils/test-functions.js";

const typeArgs = process.argv.slice(2)

switch(typeArgs[0]) {
    case 'func':
        runAllPostmanTests();
        break;
    default:
        console.error('You need to provide valid arguments');
}