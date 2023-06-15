import gulp from "gulp";
import eslint from "gulp-eslint";

export default async function lint() {
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
