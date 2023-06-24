import gulp from "gulp";
import eslint from "gulp-eslint-new";

export default async function lint() {
  return Promise.all(
    ["src", "test"].map(async (folder) =>
      gulp
        .src(`${folder}/**/*.ts`)
        .pipe(
          eslint({
            configType: "eslintrc"
          })
        )
        .pipe(eslint.format())
    )
  );
};
