if (!customElements.get('f-variant-selects')) {
	class VariantSelects extends HTMLElement {
		constructor() {
			super();
			this.selectors = {
				productSku: '[data-product-sku]',
				productAvailability: '[data-product-availability]',
			}

			this.Helpers = window.Foxify.Helpers
			this.sectionId = this.dataset.sectionId
			this.section = document.getElementById(`f-${this.sectionId}`)
			this.productForm = this.section.querySelector('f-product-form')
			this.domNodes = this.Helpers.queryDomNodes(this.selectors, this.section)
			this.addEventListener('change', this.onVariantChange);
		}

		onVariantChange() {
			this.updateOptions();
			this.updateMasterId();
			this.toggleAddButton(true, '', false);
			this.updatePickupAvailability();
			this.removeErrorMessage();

			if (!this.currentVariant) {
				this.toggleAddButton(true, '', true);
				this.setUnavailable();
			} else {
				this.updateMedia();
				this.updateURL();
				this.updateVariantInput();
				this.renderProductInfo();
				this.updateShareUrl();
				this.updateProductMeta()
			}
		}

		updateOptions() {
			this.options = Array.from(this.querySelectorAll('select'), (select) => select.value);
		}

		updateMasterId() {
			this.currentVariant = this.getVariantData().find((variant) => {
				return !variant.options.map((option, index) => {
					return this.options[index] === option;
				}).includes(false);
			});
		}

		updateMedia() {
			if (!this.currentVariant) return;
			if (!this.currentVariant.featured_media) return;

			const mediaGallery = this.section.querySelector('f-media-gallery')

			if (mediaGallery) mediaGallery.setActiveMedia(this.currentVariant.featured_media.id)
		}

		updateURL() {
			if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
			window.history.replaceState({ }, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
		}

		updateShareUrl() {
			const shareButton = document.getElementById(`Share-${this.dataset.section}`);
			// if (!shareButton || !shareButton.updateUrl) return;
			// shareButton.updateUrl(`${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`);
		}

		updateVariantInput() {
			const productForms = document.querySelectorAll(`#product-form-${this.sectionId}, #product-form-installment-${this.sectionId}`);
			productForms.forEach((productForm) => {
				const input = productForm.querySelector('input[name="id"]');
				input.value = this.currentVariant.id;
				input.dispatchEvent(new Event('change', { bubbles: true }));
			});
		}

		updatePickupAvailability() {
			const pickUpAvailability = document.querySelector('pickup-availability');
			if (!pickUpAvailability) return;

			if (this.currentVariant && this.currentVariant.available) {
				pickUpAvailability.fetchAvailability(this.currentVariant.id);
			} else {
				pickUpAvailability.removeAttribute('available');
				pickUpAvailability.innerHTML = '';
			}
		}

		removeErrorMessage() {
			if (this.productForm) this.productForm.handleErrorMessage();
		}

		renderProductInfo() {
			const classes = {
				onSale: 'f:price--on-sale',
				soldOut: 'f:price--sold-out',
				hide: 'f:hidden',
				visibilityHidden: 'f:visibility-hidden'
			}
			const selectors = {
				priceWrapper: '.f\\:price',
				salePrice: '.f\\:price-item--sale',
				compareAtPrice: ['.f\\:price-item--regular'],
				unitPrice: '.f\\:price__unit',
				saleBadge: '.f\\:price__badge-sale',
				saleAmount: '[data-sale-value]'
			}
			const {money_format} = window.Foxify.Settings
			const {
				priceWrapper,
				salePrice,
				unitPrice,
				compareAtPrice,
				saleBadge,
				saleAmount
			} = this.Helpers.queryDomNodes(selectors, this.section)

			const {compare_at_price, price, unit_price_measurement} = this.currentVariant

			this.toggleAddButton(!this.currentVariant.available, window.Foxify.Strings.soldOut);

			const onSale = compare_at_price && compare_at_price > price
			const soldOut = !this.currentVariant.available

			if (onSale) {
				priceWrapper.classList.add(classes.onSale)
			} else {
				priceWrapper.classList.remove(classes.onSale)
			}

			if (soldOut) {
				priceWrapper.classList.add(classes.soldOut)
			} else {
				priceWrapper.classList.remove(classes.soldOut)
			}

			if (priceWrapper) priceWrapper.classList.remove(classes.visibilityHidden)
			if (salePrice) salePrice.innerHTML = this.Helpers.formatMoney(price, money_format)

			if (compareAtPrice?.length && compare_at_price > price) {
				compareAtPrice.forEach(item => item.innerHTML = this.Helpers.formatMoney(compare_at_price, money_format))
			} else {
				compareAtPrice.forEach(item => item.innerHTML = this.Helpers.formatMoney(price, money_format))
			}

			if (saleBadge && compare_at_price > price) {
				const type = saleBadge.dataset.type
				if (type === 'text') return
				let value
				if (type === 'percentage') {
					const saving = (compare_at_price - price) * 100 / compare_at_price
					value = Math.round(saving) + '%'
				}
				if (type === 'fixed_amount') {
					value = this.Helpers.formatMoney(compare_at_price - price, money_format)
				}

				saleAmount.textContent = value
			}

			if (unit_price_measurement && unitPrice) {
				unitPrice.classList.remove(classes.hide)
				const unitPriceContent = `<span>${this.Helpers.formatMoney(this.currentVariant.unit_price, money_format)}</span>/<span data-unit-price-base-unit>${this._getBaseUnit()}</span>`
				unitPrice.innerHTML = unitPriceContent
			} else {
				unitPrice?.classList.add(classes.hide)
			}
		}

		_getBaseUnit = () => {
			return this.currentVariant.unit_price_measurement.reference_value === 1
				? this.currentVariant.unit_price_measurement.reference_unit
				: this.currentVariant.unit_price_measurement.reference_value +
				this.currentVariant.unit_price_measurement.reference_unit
		}

		updateProductMeta() {
			const {available, sku, noSku} = this.currentVariant
			const {inStock, outOfStock} = window.Foxify.Strings
			const {productAvailability, productSku} = this.domNodes;

			if (productSku) {
				if (sku) {
					productSku.textContent = sku
				} else {
					productSku.textContent = noSku
				}
			}

			if (productAvailability) {
				if (available) {
					productAvailability.textContent = inStock
					productAvailability.classList.remove('out-of-stock')
				} else {
					productAvailability.textContent = outOfStock
					productAvailability.classList.add('out-of-stock')
				}
			}
		}

		toggleAddButton(disable = true, text, modifyClass = true) {
			if (!this.productForm) return;

			const addButton = this.productForm.querySelector('[name="add"]')
			if (!addButton) return;

			const addButtonText = addButton.querySelector('.f\\:btn__label')
			if (disable) {
				addButton.setAttribute('disabled', 'disabled')
				if (text) addButtonText.textContent = text
			} else {
				addButton.removeAttribute('disabled')
				addButtonText.textContent = window.Foxify.Strings.addToCart
			}

			if (!modifyClass) return;
		}

		setUnavailable() {
			const addButton = this.productForm.querySelector('[name="add"]')
			if (addButton) {
				const addButtonText = addButton.querySelector('.f\\:btn__label')
				addButtonText.textContent = window.Foxify.Strings.unavailable
			}

			const priceWrapper = this.section.querySelector('.f\\:price')
			if (priceWrapper) priceWrapper.classList.add('f:visibility-hidden')
		}

		getVariantData() {
			this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
			return this.variantData;
		}
	}

	customElements.define('f-variant-selects', VariantSelects);

	if (!customElements.get('f-variant-buttons')) {
		class VariantRadios extends VariantSelects {
			constructor() {
				super();
			}

			updateOptions() {
				const options = Array.from(this.querySelectorAll('.f\\:variant-picker__input'));
				this.options = options.map((option) => {
					return Array.from(option.querySelectorAll('input')).find((radio) => radio.checked).value;
				});
			}
		}
		customElements.define('f-variant-buttons', VariantRadios);
	}
}
