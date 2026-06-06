See full api for TGuy class in [libtguy.js](libtguy.js)

Example usage
```html
<script src="libtguy.js"></script>
<script type='text/javascript'>
    (async () => {
        async function TGuyModuleInit() {
            let Module = {};
            Module.segmenter = (typeof Intl?.Segmenter === 'function')
                ? new Intl.Segmenter(undefined, {granularity: "grapheme"})
                : null;
            // don't load libtguy with full unicode support if we have grapheme segmenter
            Module.locateFile = (path) =>
                path.endsWith(".wasm")
                    ? (Module.segmenter ? 'libtguy.wasm' : 'libtguy_unicode.wasm')
                    : path;
            return TGuyModule(Module);
        }
        
        const Module = await TGuyModuleInit();

        const input = "text";
        const text = Module.segmenter ? Array.from(Module.segmenter.segment(input), el => el.segment) : input;
        const spacing = 4;
        let tg = new Module.TGuy(text, spacing);
        for (const tgElement of tg) {
            console.log(tgElement);
        }
        tg.destructor();
    })();
</script>
```

```text
🗑(> ^_^)>    text
🗑 (> ^_^)>   text
🗑  (> ^_^)>  text
🗑   (> ^_^)> text
🗑    (> ^_^)>text
🗑   t<(^_^ <) ext
🗑  t<(^_^ <)  ext
🗑 t<(^_^ <)   ext
🗑t<(^_^ <)    ext
🗑<(^_^ <)     ext
🗑(> ^_^)>     ext
🗑 (> ^_^)>    ext
🗑  (> ^_^)>   ext
🗑   (> ^_^)>  ext
...
```
