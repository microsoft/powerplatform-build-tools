import gulp from "gulp";
import mocha from "gulp-mocha";
import eslint from "gulp-eslint";

export default function unitTest() {
  return gulp
    .src("test/unit-test/*.test.ts", { read: false })
    .pipe(
      mocha({
        require: ["ts-node/register"],
        ui: 'bdd',
        color: true,
      }).on('error', process.exit.bind(process, 1))
    )
    .pipe(eslint.format());
};
