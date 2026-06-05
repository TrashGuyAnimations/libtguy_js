(function () {
    const
        TYPE_PTR = Module.TGUY_DO_NOT_UNROLL_STRING = '*',
        TYPE_I32 = Module.TGUY_DO_NOT_UNROLL_STRING = 'i32',
        /* prevent closure compiler from inlining string constants by using Module extern */
        NUMBER = Module.TGUY_DO_NOT_UNROLL_STRING = 'number',
        STRING = Module.TGUY_DO_NOT_UNROLL_STRING = 'string',
        ctor_args = [NUMBER, NUMBER, STRING, NUMBER, STRING, NUMBER, STRING, NUMBER, STRING],
        tguy_from_utf8_ex = cwrap('tguy_from_utf8_ex', NUMBER, [STRING, ...ctor_args]),
        tguy_from_cstr_arr_ex = cwrap('tguy_from_cstr_arr_ex', NUMBER, [NUMBER, ...ctor_args]),
        tguy_set_frame = cwrap('tguy_set_frame', NUMBER, [NUMBER, NUMBER]),
        tguy_get_string = cwrap('tguy_get_string', STRING, [NUMBER, NUMBER]),
        tguy_free = cwrap('tguy_free', undefined, [NUMBER]),
        tguy_get_frames_count = cwrap('tguy_get_frames_count', NUMBER, [NUMBER]),
        tguy_get_arr = cwrap('tguy_get_arr', NUMBER, [NUMBER, NUMBER]),
        tguy_set_pos = cwrap('tguy_set_pos', NUMBER, [NUMBER, NUMBER, NUMBER, NUMBER]),
        tguy_get_frame_state = cwrap('tguy_get_frame_state', NUMBER, [NUMBER, NUMBER, NUMBER, NUMBER, NUMBER]),
        tguy_get_version = cwrap('tguy_get_version', NUMBER, []),
        getInt = Module.TGUY_DO_NOT_UNROLL_FUNC = (mem) => getValue(mem, TYPE_I32),
        getPtr = Module.TGUY_DO_NOT_UNROLL_FUNC = (mem) => getValue(mem, TYPE_PTR);

    class TGuy {
        /**
         * @param {(string|Array<string>)} text
         * @param {number=} spacing
         * @param {?string=} space
         * @param {?string=} can
         * @param {?string=} right
         * @param {?string=} left
         * @throws {RangeError|TypeError}
         */
        constructor(text, spacing = 4, space = null, can = null, right = null, left = null) {
            /** @type {(string|Array<string>)} */
            this.text = text;
            /** @type {number|null} */
            this.tgobj = null;
            /** @type {number} */
            this.nframes = 0;
            /** @type {number} */
            this.frame = 0;
            /** @type {function((string|number),number,number,string?,number,string?,number,string?,number,string?,number)}*/
            let tguy_constructor;
            /** @type {number} */
            let len;
            /** @type {?number} */
            let stack = null;

            if (text.length === 0) {
                /* in case empty array is passed */
                text = '';
            }

            if (Array.isArray(text)) {
                if (!text.every(s => typeof s === 'string')) {
                    throw TypeError('text must only contain strings');
                }

                /* this allocated block of memory is in form of
                struct {
                    char *arr[text.length];
                    char str_mem[strings_size_bytes];
                } */
                const arr_size_bytes = text.length * POINTER_SIZE;
                const strings_size_bytes = text.reduce(((acc, val) => acc + lengthBytesUTF8(val) + 1), 0);
                /* allocate array of char * + memory for storing strings including nul terminators */
                stack = stackSave();
                let arr_mem = stackAlloc(arr_size_bytes + strings_size_bytes);
                let str_mem = arr_mem + arr_size_bytes;
                text.forEach((chrs, i) => {
                    /* point arr to memory of str_mem, where we write current string */
                    setValue(arr_mem + (i * POINTER_SIZE), str_mem, TYPE_PTR);
                    /* advance memory by number of bytes written + nul terminator */
                    str_mem += stringToUTF8(chrs, str_mem, lengthBytesUTF8(chrs) + 1) + 1;
                });

                tguy_constructor = tguy_from_cstr_arr_ex;
                len = text.length;
                text = arr_mem;
            } else if (typeof text === 'string') {
                tguy_constructor = tguy_from_utf8_ex;
                len = lengthBytesUTF8(text);
            } else {
                throw TypeError('text must be a string or array of strings');
            }

            this.tgobj = tguy_constructor(text, len, spacing, space, -1, can, -1, right, -1, left, -1);
            if (stack !== null) {
                stackRestore(stack);
            }

            if (this.tgobj === null) {
                throw RangeError('Out of memory');
            }

            this.nframes = tguy_get_frames_count(this.tgobj);
            this.frame = 0;
            this.first_element_frames_count = (spacing + 1) * 2;
        }

        /** @returns {void} */
        destructor() {
            tguy_free(this.tgobj);
        }

        /**
         * @param {number} i
         * @returns {void}
         * @throws RangeError
         */
        set_frame(i) {
            if (i < 0 || i >= this.nframes) {
                throw RangeError(`Bad index value ${i}, must be in range [0, ${this.nframes})`);
            }
            tguy_set_frame(this.tgobj, i);
            this.frame = i;
        }

        /**
         * @param sprite_pos
         * @param facing_right
         * @param element_index
         * @returns {number}
         * @throws RangeError
         */
        set_pos(sprite_pos, facing_right, element_index) {
            let frame = tguy_set_pos(this.tgobj, sprite_pos, facing_right, element_index);
            if (frame === -1) {
                throw RangeError(`Invalid position provided`);
            }
            return frame;
        }

        /** @return {{frame:number,sprite_pos:number,facing_right:number,element_index:number}} */
        get_frame_state() {
            const stack = stackSave();
            const mem = stackAlloc(4 * 4);
            const p_frame = mem, p_pos = mem + 4, p_facing_right = mem + 8, p_element_index = mem + 12;
            tguy_get_frame_state(this.tgobj, p_frame, p_pos, p_facing_right, p_element_index);
            let ret = {
                'frame': getInt(p_frame),
                'sprite_pos': getInt(p_pos),
                'facing_right': getInt(p_facing_right),
                'element_index': getInt(p_element_index)
            };
            stackRestore(stack);
            return ret;
        }

        /** @returns {number} */
        get_current_frame() {
            return this.frame;
        }

        /** @returns {number} */
        get_frames_count() {
            return this.nframes;
        }

        /** @return {Array<{str:string,len:number}>} */
        get_arr() {
            let arrPtr = tguy_get_arr(this.tgobj), outArr = [];

            while (1) {
                const strPtr = getPtr(arrPtr);
                if (strPtr === 0) break;
                const strLen = getPtr(arrPtr + POINTER_SIZE);
                outArr.push({'str': UTF8ToString(strPtr, strLen, true), 'len': strLen});
                arrPtr += (POINTER_SIZE * 2);
            }

            return outArr;
        }

        /** @returns {number} */
        get_first_frame_for_element(element_index) {
            return element_index * (element_index + this.first_element_frames_count - 1);
        }

        /** @returns {string} */
        toString() {
            return tguy_get_string(this.tgobj, null);
        }

        /** @returns {{next: function(): {value: string?, done: boolean}}} */
        [Symbol.iterator]() {
            let index = 0;
            return {
                next: () => {
                    if (index < this.nframes) {
                        this.set_frame(index++);
                        return {
                            value: this.toString(), done: false
                        };
                    }
                    return {
                        value: null, done: true
                    };
                }
            };
        }
    }

    const prot = TGuy.prototype;
    /* make so that closures don't optimize or rename methods out */
    prot['destructor'] = prot.destructor;
    prot['set_frame'] = prot.set_frame;
    prot['get_current_frame'] = prot.get_current_frame;
    prot['get_frames_count'] = prot.get_frames_count;
    prot['get_arr'] = prot.get_arr;
    prot['get_first_frame_for_element'] = prot.get_first_frame_for_element;
    prot['get_frame_state'] = prot.get_frame_state;
    prot['set_pos'] = prot.set_pos;

    Module['TGuy'] = TGuy;
    Module['TGuyVersion'] = tguy_get_version();
})();
