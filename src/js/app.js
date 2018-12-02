/* global CryptoJS */
/* global sessionStorage */
/* global TAFFY */
/* global $ */

let App = {
    fn: {
        idg: (table_) => ((table_().count() || 0) + 1),
        uidg: () => ((App.Database.Tables.users().count() || 0) + 1),
        sidg: () => ((App.Database.Tables.subjects().count() || 0) + 1),
        urib: (fp_) => window.location.protocol + "//" + window.location.host + "/" + fp_,
        _enc: (pass_) => CryptoJS.HmacSHA256(pass_, App.ipfx).toString(),
        _ver: (hash_, pass_) => hash_ === App.fn._enc(pass_),
    },
    Database: {
        initialize: () => {
            App.Database.Tables.account_type = TAFFY().store('account_type');
            App.Database.Tables.account_type.merge([
                { id: 1, name: "Administrator", alias: "Admin" },
                { id: 2, name: "Teacher", alias: "Teacher" },
                { id: 3, name: "Parent", alias: "Parent" },
                { id: 4, name: "Student", alias: "Student" },
            ], 'id');

            App.Database.Tables.users = TAFFY().store('users');
            // App.Database.Tables.users.settings({
            // template: {
            // id: App.fn.uidg(),
            // first_name: "",
            // last_name: "",
            // username: "",
            // email: "",
            // hash: "",
            // date_created: Date.now(),
            // account_type: App.Database.Tables.account_type({ alias: 'Student' }).first().id,
            // }
            // });

            if (App.Database.Tables.users().count() < 1)
                App.Database.Tables.users.insert({
                    id: App.fn.uidg(),
                    first_name: "Administrator",
                    last_name: "One",
                    username: "admin",
                    email: "admin@example.com",
                    hash: "a9550631fc5029662893bbf815633c40560d4eb8f76e86d662edbb2d3696e820",
                    account_type: App.Database.Tables.account_type({ alias: 'Admin' }).first().id,
                    date_created: Date.now()
                });

            App.Database.Tables.subjects = TAFFY().store('subjects');
            App.Database.Tables.subjects.settings({
                template: {
                    id: App.fn.sidg(),
                }
            });

            if (App.Database.Tables.subjects().count() < 1)
                $.getJSON(App.fn.urib('.data/cxc_subjects.json'), {}, (xdt, i) => $.each(xdt.subjects, (xdr) =>
                    App.Database.Tables.subjects.insert({
                        id: App.fn.sidg(),
                        name: xdr
                    }, 'id')
                ));
        },
        Tables: {},
    },
    Boot: () => {
        console.log("App boot sequence started...");

        App.Database.initialize();
        App.History.Deserialize();

        let tpg = App.History.current().page || "login";
        let tpr = App.History.current().data || {};

        App.Navigate(tpg, tpr);

        console.log("App booted.");
    },
    Shutdown: () => {
        console.log("App shutdown sequence started...");

        App.History.Serialize();

        console.log("Shutdown.");
    },
    History: {
        __def: {
            page: null,
            data: null,
        },
        _ipos: 0,
        stack: [],
        push: (page_, data_) => App.History.stack.push({
            page: page_,
            data: data_,
        }),
        pop: () => App.History.stack.pop(),
        current: () => App.History.stack[App.History.stack.length - 1] || App.History.__def,
        previous: () => App.History.stack[App.History._ipos - 1],
        next: () => App.History.stack[App.History._ipos + 1],
        exists: () => App.History.stack.length > 0,
        AddItem: (page_, data_ = {}, pos_ = null) => {
            App.History._ipos = pos_ || App.History._ipos + 1;
            App.History.push(page_, data_);
        },
        GoBack: () => {
            if ((App.History._ipos - 1) <= 0) {
                console.error("Error:  Cannot go back!");
                $.notify("Cannot go back!", 'error');
            }
            else {
                let tmp = App.History.previous();
                App.Navigate(tmp.page, tmp.data, App.History._ipos - 1);
            }
        },
        GoForward: () => {

            if ((App.History._ipos + 1) >= App.History.stack.length) {
                console.error("Error:  Cannot go forward!");
                $.notify("Cannot go forward!", 'error');
            }
            else {
                let tmp = App.History.next();
                App.Navigate(tmp.page, tmp.data, App.History._ipos + 1);
            }
        },
        Serialize: () => sessionStorage.setItem('_xdp-h', JSON.stringify(App.History.stack)),
        Deserialize: () => App.History.stack = JSON.parse(sessionStorage.getItem('_xdp-h')) || [],
    },
    Navigate: function(page_, data_ = {}, pos_ = null) {
        // console.log(arguments);
        // page_[0] = page_[0].toUpperCase();
        document.title = page_.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
        console.log(page_);
        $(document.body).load(App.fn.urib("__HTML__/html/ltr/" + page_ + ".html"), data_, (_r, _s) => {
            if (_s === 404)
                $.notify('Page not found!', 'error');
        });

        // App.History(page_, data_, pos_); // On successful navigate
    },
    Actions: {
        Login: () => {
            let _e = $('#email').val();
            let _p = $('#password').val();

            if (_e === "" || _p === "")
                $.notify("All fields are required!", 'warn');
            else {
                let rslt = App.Database.Tables.users({ email: _e }).first();

                if (!rslt)
                    $.notify("User not found!", 'error');
                else {
                    if (App.fn._ver(rslt.hash, _p)) {
                        App.user = rslt;
                        App.Navigate('dashboard');
                    }
                    else
                        $.notify("Incorrect password!", 'error');
                }
            }
        },
    },
    ipfx: "901d1fef68b1ec0bfcabf97a8623e583b1a1522a350952835050f7a68c2a7a73",
    user: {},
};
