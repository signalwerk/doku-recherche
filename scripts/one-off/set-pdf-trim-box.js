if (scriptArgs.length !== 2) {
  throw new Error("usage: mutool run set-pdf-trim-box.js output.pdf input.pdf");
}

var outputPath = scriptArgs[0];
var inputPath = scriptArgs[1];
var document = Document.openDocument(inputPath);

if (!document.isPDF()) {
  throw new Error("input must be a PDF document");
}

for (var pageNumber = 0; pageNumber < document.countPages(); pageNumber += 1) {
  var page = document.findPage(pageNumber);
  var trimBox = page.TrimBox || page.CropBox || page.MediaBox;

  if (!trimBox) {
    throw new Error("page " + (pageNumber + 1) + " has no usable page box");
  }

  page.MediaBox = trimBox;
  page.CropBox = trimBox;
  page.BleedBox = trimBox;
  page.ArtBox = trimBox;
}

document.save(
  outputPath,
  "garbage=deduplicate,compress,compress-fonts,compress-images"
);
