const productContainers =  [...document.querySelectorAll('.product-container')];
const nxtButton = [...document.querySelectorAll('.nxt-button')];
const preButton = [...document.querySelectorAll('.pre-button')];

productContainers.forEach((item, i) => {
    let containerDimentions =item.getBoundingClientRect();
    let containerWidth = containerDimentions.width;

    nxtButton[i].addEventListener('click', () => {
        item.scrollLeft += containerWidth;
    })

    preButton[i].addEventListener('click', () => {
        item.scrollLeft -= containerWidth;
    })
})

// cart function

const add_product_to_cart = product => {
    let cart = JSON.parse(localStorage.getItem('cart'));

    if(cart == null){
        cart = []
    }

    product = {
        item: 1,
        name: product.name,
        price: product.price,
        shortDes: product.shortDes,
        image: product.image
    }

    cart.push(product);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateNavCartCounter();
    return 'added';
}
