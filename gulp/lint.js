const gulp = require("gulp");
const eslint = require("gulp-eslint");

module.exports = async function lint() {
  return Promise.all(
    ["src", "test"].map(async (folder) =>
      gulp
        .src(`${folder}/**/*.ts`)
        .pipe(
          eslint({
            formatter: "verbose",
            configuration: `${folder}/.eslintrc.yml`,
          })
        )
        .pipe(eslint.format())
    )
  );
};
