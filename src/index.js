import {
  query,
  createElement,
  getElementIndex,
  traverse,
  uniqueId,
  clone,
  createElementString,
} from './base.js';

const SymbolId = Symbol('id');
const CompositeMap = new Map();
const EmptyCompositeData = {
  tag: 'div',
  text: 'placeholder',
  attributes: {
    'data-role': 'placeholder',
    'data-belong': 'root',
    style: `width: 100%;height: 100%;`,
  },
};
const selectedIds = [];
const MaterialOptionsMap = new Map();

globalThis.CompositeMap = CompositeMap;

let compositeBox = null;
let compositeZone = null;
let attributeContainer = null;
let styleContainer = null;
let customMaterials = null;
let allSelector = null;
let materialNameInput = null;
let materialJSONInput = null;
let attributeNameInput = null;
let attributeValueInput = null;
let styleNameInput = null;
let styleValueInput = null;
let styleNames = null;

let operatedId = '';
let compositeData = EmptyCompositeData;
let defaultHeaderFixed = true;
let parasitized = true;
let displayText = '';

function main() {
  customMaterials = query('.custom-materials');
  compositeBox = query('.composite-box');
  compositeZone = query('.composite-zone');
  attributeContainer = query('.attribute-container');
  styleContainer = query('.style-container');
  allSelector = query('#all-selector');
  materialNameInput = query('input[data-role="material-name-input"]');
  materialJSONInput = query('textarea[data-role="material-json-input"]');
  attributeNameInput = query('input[data-role="attribute-name-input"]');
  attributeValueInput = query('input[data-role="attribute-value-input"]');
  styleNameInput = query('input[data-role="style-name-input"]');
  styleValueInput = query('input[data-role="style-value-input"]');
  styleNames = query('datalist#style-names');

  renderCompositeZone();

  document.addEventListener('dragstart', handleDocumentDragstart);
  document.addEventListener('dragenter', handleDocumentDragenter);
  document.addEventListener('dragover', handleDocumentDragover);
  document.addEventListener('drop', handleDocumentDrop);
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('change', handleDocumentChange);

  styleNames.append(...([...document.defaultView.getComputedStyle(document.body, '')].map(styleName => {
    return createElement({
      tag: 'option',
      attributes: {
        value: styleName,
      },
    });
  })));
}

function handleDocumentDragenter(event) {
  const { target } = event;
  if (checkDroppable(target)) {
    event.preventDefault();
  }
}

function handleDocumentDragover(event) {
  const { target } = event;
  if (checkDroppable(target)) {
    event.preventDefault();
  }
}

function handleDocumentDragstart(event) {
  const { target } = event;
  const { innerText, dataset: { materialType, materialId, role, parasite, id } } = target;
  const transferBase = {
    materialType,
  };
  switch (materialType) {
    case 'block':
    case 'flex':
    case 'grid':
      event.dataTransfer.setData('json', JSON.stringify(transferBase));
      return;
    case 'placeholder':
      event.dataTransfer.setData('json', JSON.stringify({
        ...transferBase,
        tag: 'div',
        text: '<placeholder>',
        attributes: {
          'data-role': 'tobe_placeholder',
          'data-belong': 'custom',
          'data-place-type': 'inplace',
        },
      }));
      return;
    case 'native':
      event.dataTransfer.setData('json', JSON.stringify({
        ...transferBase,
        tag: innerText.slice(1, -1),
        text: innerText + Date.now(),
      }));
      return;
    case 'custom':
      if (!materialId || !MaterialOptionsMap.has(materialId)) {
        return;
      }
      event.dataTransfer.setData('json', JSON.stringify({
        ...transferBase,
        ...JSON.parse(MaterialOptionsMap.get(materialId)),
      }));
      return;
  }
  if (role === 'parasite'
    && parasite === 'wrapper'
  ) {
    event.dataTransfer.setData('id', id);
    return;
  }
}

function handleDocumentDrop(event) {
  const { target, dataTransfer } = event;
  const { dataset: { belong, id, place, placeType } } = target;
  let optionsData = null;
  let renderDirectly = false;

  const transferJSON = dataTransfer.getData('json');
  if (transferJSON) {
    optionsData = {
      id: uniqueId(),
      ...JSON.parse(dataTransfer.getData('json')),
    };
  }

  const transferId = dataTransfer.getData('id');
  if (transferId) {
    renderDirectly = true;
    const copiedOptions = clone(CompositeMap.get(transferId).options);
    useNewId(copiedOptions);
    optionsData = copiedOptions;
  }

  const parentElementData = CompositeMap.get(id);

  switch (belong) {
    case 'root':
      compositeData = getWrappedElement(getMaterialOptions(optionsData));
      renderCompositeZone();
      return;
    case 'block':
    case 'flex':
    case 'grid':
      parentElementData.options.children
        .splice(
          place,
          placeType === 'insert' ? 0 : 1,
          renderDirectly ? getWrappedElement(optionsData) : getWrappedElement(getMaterialOptions(optionsData))
        );
      renderCompositeZone();
      return;
    case 'custom':
      const { ancestor, routes } = getValidIdAncestor(target);
      handleMaterialDrop(
        CompositeMap.get(ancestor[SymbolId]).options,
        routes,
        placeType,
        getWrappedElement(getMaterialOptions(optionsData)),
      );
      renderCompositeZone();
      return;
    default:
      break;
  }
}

function handleMaterialDrop(options, routes, placeType, placeData) {
  const parentRoutes = routes.slice(0, -2);
  const parentOption = parentRoutes
    .filter((_, index) => index % 2 !== 0)
    .reduce((_options, curr) => {
      return _options.children.at(curr);
    }, options);
  parentOption.children.splice(routes.at(-1), placeType === 'insert' ? 0 : 1, placeData);
}

function addMaterial(id, name, options) {
  MaterialOptionsMap.set(id, JSON.stringify(options));
  customMaterials.append(createElement({
    tag: 'div',
    text: name,
    attributes: {
      'data-role': 'material',
      'data-material-type': 'custom',
      'data-material-id': id,
      draggable: true,
    },
  }));
}

function deleteCompositeItem(options) {
  const { id, children: [ _, bone ] } = options;
  if (Array.isArray(bone.children)) {
    bone.children.forEach(child => {
      if (child.attributes['data-role'] !== undefined
        && child.attributes['data-role'] !== 'placeholder'
      ) {
        deleteCompositeItem(child);
      }
    });
  }
  CompositeMap.delete(id);
  CompositeMap.delete(id.slice(0, -8));
}

const Function = {
  handleUpdate: () => {
    renderCompositeZone();
  },
  handleDelete: (target) => {
    const { dataset: { id } } = target;
    const currWrapper = CompositeMap.get(`${id}-wrapper`).element;
    const { parentElement } = currWrapper;

    if (parentElement.dataset.role === 'root') {
      compositeData = EmptyCompositeData;
      renderCompositeZone();
      CompositeMap.delete(id);
      CompositeMap.delete(`${id}-wrapper`);
      return;
    }

    const currWrapperIndex = getElementIndex(currWrapper);
    const { ancestor, routes } = getValidIdAncestor(parentElement);
    const ancestorOptions = CompositeMap.get(ancestor[SymbolId]).options;

    switch (ancestor.parentElement.dataset.display) {
      case 'block':
      case 'flex':
        ancestorOptions.children.splice(currWrapperIndex, 1);
        break;
      case 'grid':
        ancestorOptions.children.splice(
          currWrapperIndex,
          1,
          getPlaceholderOptions(ancestor[SymbolId], 'grid', currWrapperIndex, 'inplace')
        );
        break;
      case 'custom':
        routes.filter((_, index) => index % 2 !== 0)
          .reduce((parent, curr) => {
            parent = parent.children.at(curr);
            return parent;
          }, ancestorOptions).children.splice(
            currWrapperIndex,
            1,
            getPlaceholderOptions(ancestor[SymbolId], 'custom', currWrapperIndex, 'inplace')
          );
        break;
    }
    renderCompositeZone();
    deleteCompositeItem(CompositeMap.get(`${id}-wrapper`).options);
    // CompositeMap.delete(id);
    // CompositeMap.delete(`${id}-wrapper`);
  },
  handleAddMaterial: () => {
    try {
      addMaterial(uniqueId(), materialNameInput.value, JSON.parse(materialJSONInput.value));
    } catch (error) {
      console.error(error);
    }
  },
  handleSaveAsMaterial: (target) => {
    const { dataset: { id } } = target;
    const materialName = document.getElementById(`${id}-material-name`).value;
    const copiedOptions = clone(CompositeMap.get(`${id}-wrapper`).options);
    const convertedOptions = convertTobePlaceholder(getBone(copiedOptions));
    addMaterial(uniqueId(), materialName, convertedOptions);
  },
  handleCopy: async () => {
    try {
      await navigator.clipboard.writeText(displayText);
      console.log('Content copied to clipboard');
    } catch (error) {
      console.error(error);
    }
  },
  handleAddAttribute: () => {
    if (!operatedId) return;

    const name = attributeNameInput.value;
    const value = attributeValueInput.value;
    const { options } = CompositeMap.get(operatedId);

    if (options.attributes === undefined) {
      options.attributes = { [name]: value };
    } else if (Object.keys(options.attributes).includes(name)) {
      console.error(`${name} is in attributes!`);
    } else {
      options.attributes[name] = value;
    }

    renderAttributeContainer(operatedId, options);
    renderCompositeZone();
  },
  handleAddStyle: () => {
    if (!operatedId) return;

    const name = styleNameInput.value;
    const value = styleValueInput.value;
    const { options } = CompositeMap.get(operatedId);

    if (value
      && !CSS.supports(`${name}: ${value}`)  
    ) {
      console.error(`${value} is not supported for ${name}!`);
      return;
    }

    if (options.attributes === undefined) {
      options.attributes = { style: `${name}: ${value};` };
    } else if (options.attributes.style === undefined) {
      options.attributes.style = `${name}: ${value};`;
    } else if ((new RegExp(`(?<!\-)${name}:`, 'g').test(options.attributes.style))) {
      console.error(`${name} is in style!`);
    } else {
      options.attributes.style += `${name}: ${value};`;
    }

    renderStyleContainer(operatedId, options);
    renderCompositeZone();
  },
};

function convertTobePlaceholder(options) {
  const { attributes, children } = options;
  if (attributes
    && /(tobe_)+placeholder/.test(attributes['data-role'])
  ) {
    attributes['data-role'] = attributes['data-role'].slice(5);
  }

  if (Array.isArray(children)) {
    children.forEach(convertTobePlaceholder);
  }

  return options;
}

// function getBone(wrapperOptions) {
//   debugger;
//   const { attributes } = wrapperOptions;
//   if (attributes && attributes['data-role'] === 'placeholder') {
//     return undefined;
//   }

//   let noParasiteChildrenFlag = true;

//   if (Array.isArray(wrapperOptions.children)) {
//     wrapperOptions.children.every(function checkParasitized(child) {
//       if (child.attributes === undefined
//         || !['placeholder', 'parasite'].includes(child.attributes['data-role'])
//       ) {
//         if (Array.isArray(child.children)) {
//           return child.children.every(checkParasitized);
//         }
//         return true;
//       }
//       return false;
//     });
//   }

//   if ((attributes === undefined
//     || !['placeholder', 'parasite'].includes(attributes['data-role']))
//     && noParasiteChildrenFlag
//   ) {
//     return removeParasiteProperty(wrapperOptions);
//   }

//   const bone = wrapperOptions.children[1];
//   if (Array.isArray(bone.children)) {
//     bone.children = bone.children.map(child => {
//       return getBone(child);
//     }).filter(Boolean);
//   }

//   removeParasiteProperty(bone);
//   if (Array.isArray(bone.children)
//     && bone.children.length === 0
//   ) {
//     bone.children = undefined;
//   }
//   return bone;
// }

function getBone(options) {
  const { attributes, children } = options;
  if (attributes
    && attributes['data-role'] === 'parasite'
    && attributes['data-parasite'] === 'wrapper'
  ) {
    return children.slice(1).map(child => {
      const { attributes, children } = options;
      if (attributes
        && attributes['data-role'] === 'parasite'
        && attributes['data-parasite'] === 'wrapper'
      ) return getBone(child);

      if (attributes && attributes['data-role'] === 'placeholder') return undefined;

      if (Array.isArray(children)) {
        child.children = children.map(getBone).filter(Boolean);
      }
      removeParasiteProperty(child);
      return child;
    }).filter(Boolean)[0];
  }
  if (attributes && attributes['data-role'] === 'placeholder') return undefined;
  if (Array.isArray(children)) {
    options.children = children.map(getBone).filter(Boolean);
  }
  removeParasiteProperty(options);
  return options;
}

function removeParasiteProperty(bone) {
  bone.id = undefined;
  bone.lifecycle = undefined;
  bone.materialType = undefined;
  return bone;
}

function handleDocumentClick(event) {
  const { target } = event;
  const { dataset: { functionName } } = target;
  if (Function[functionName]) {
    Function[functionName](target);
    return;
  }

  if (target.dataset.role === 'parasite'
    && (target.dataset.parasite === 'wrapper'
      || target.parentElement.dataset.parasite === 'wrapper')
  ) {
    const { dataset: { id } } = target;
    const { options } = CompositeMap.get(id);
    operatedId = id;
    renderAttributeContainer(id, options);
    renderStyleContainer(id, options);
    return;
  }
}

function getAttributeInputType(attribute) {
  if (['color', 'background-color'].includes(attribute)) {
    return 'color';
  }
  return 'text';
}

function renderAttributeContainer(id, options) {
  const { attributes } = options;
  if (attributes === undefined) {
    attributeContainer.replaceChildren();
    return;
  }
  const attributeOptions = [];
  Object.keys(attributes)
    .forEach(attribute => {
      if (attribute === 'style') {
        return;
      }
      attributeOptions.push(
        {
          tag: 'label',
          text: `${attribute}:`,
          attributes: {
            for: `${id}-${attribute}`,
          },
        },
        {
          tag: 'input',
          attributes: {
            'data-role': 'attribute-input',
            'data-attribute-type': 'attribute',
            'data-attribute-name': attribute,
            'data-id': id,
            id: `${id}-${attribute}`,
            type: getAttributeInputType(attribute),
            value: attributes[attribute],
          },
        },
      );
    });
  attributeContainer.replaceChildren(...createElement(attributeOptions));
}

function renderStyleContainer(id, options) {
  let styles = {};
  if (options.attributes !== undefined
    && options.attributes.style !== undefined
  ) {
    styles = options.attributes.style.split(';').filter(Boolean).reduce((acc, curr) => {
      const [tempStyleProperty, tempValue] = curr.split(':');
      acc[tempStyleProperty.trim()] = tempValue.trim();
      return acc;
    }, {});
  }

  const styleAttributes = {
    // height: '',
    // color: '',
    // 'background-color': '',
    ...styles,
  };
  const styleAttributeOptions = [];
  Object.keys(styleAttributes).forEach(styleName => {
    styleAttributeOptions.push(
      {
        tag: 'label',
        text: `${styleName}:`,
        attributes: {
          for: `${id}-style-${styleName}`,
        },
      },
      {
        tag: 'input',
        attributes: {
          'data-role': 'attribute-input',
          'data-attribute-type': 'style',
          'data-attribute-name': styleName,
          'data-id': id,
          id: `${id}-style-${styleName}`,
          type: 'text',
          value: styleAttributes[styleName],
        },
      },
    );
  });
  styleContainer.replaceChildren(...createElement(styleAttributeOptions));
}

function updateAttribute(attributeElement) {
  const { dataset: { id, attributeType, attributeName }, value } = attributeElement;
  const bone = CompositeMap.get(id).options;

  if (attributeType === 'attribute') {
    if (bone.attributes === undefined) {
      bone.attributes = { attributeName: value };
    } else {
      bone.attributes[attributeName] = value;
    }
  }

  if (attributeType === 'style') {
    const styleText = `${attributeName}: ${value}`;

    if (!CSS.supports(styleText)) {
      console.error(`${value} is not supported for ${attributeName}!`);
      return;
    }

    if (bone.materialType === 'grid'
      && attributeName === 'grid'
    ) {
      const [rowString, colString] = value.split('/');
      const rows = rowString.split(' ').filter(Boolean);
      const cols = colString.split(' ').filter(Boolean);
      const oldLength = bone.children.length;
      const newLength = rows.length * cols.length;
      if (newLength > oldLength) {
        bone.children
          .push(...(Array(newLength - oldLength)
          .fill(0)
          .map((_, index) => getPlaceholderOptions(id, 'grid', oldLength + index, 'inplace'))));
      }
      if (newLength < oldLength) {
        bone.children.length = newLength;
      }
    }
    if (bone.attributes === undefined) {
      bone.attributes = {
        style: styleText + ';',
      };
    } else if (bone.attributes.style === undefined) {
      bone.attributes.style = styleText + ';';
    } else {
      const oldStyle = bone.attributes.style;
      const regexp = new RegExp(`(?<!\-)${attributeName}:[^;]+`, 'g');
      if (regexp.test(oldStyle)) {
        bone.attributes.style = oldStyle.replaceAll(regexp, styleText);
      } else {
        bone.attributes.style = oldStyle + styleText + ';';
      }
    }
  }
}

function handleSelectCheck(target) {
  const { checked, dataset: { id } } = target;
  const indexOfID = selectedIds.indexOf(id);
  if (checked && indexOfID === -1) {
    selectedIds.push(id);
  }
  if (!checked && indexOfID !== -1) {
    selectedIds.splice(indexOfID, 1);
  }

  switch (selectedIds.length) {
    case 0:
      allSelector.checked = false;
      allSelector.indeterminate = false;
      return;
    case CompositeMap.size / 2:
      allSelector.checked = true;
      allSelector.indeterminate = false;
      return;
    default:
      allSelector.checked = false;
      allSelector.indeterminate = true;
  }
}

function handleDocumentChange(event) {
  const { target } = event;
  const { value, dataset: { id, role, parasite } } = target;

  if (role === 'parasite') {
    if (parasite === 'element-select-checkbox') {
      handleSelectCheck(target);
    }
    if (parasite === 'header-fixed-checkbox') {
      const { checked } = target;
      const { element, options } = CompositeMap.get(`${id}-wrapper`);
      element.dataset.headerFixed = checked;
      options.attributes['data-header-fixed'] = checked;
      return;
    }
    if (parasite === 'drag-mode-selector') {
      const { value, dataset: { id } } = target;
      const { element, options } = CompositeMap.get(`${id}-wrapper`);
      options.attributes['data-drag-mode'] = value;
      if (value === 'no-drag') {
        element.draggable = false;
        options.attributes.draggable = false;
      }
      if (value === 'copy') {
        element.draggable = true;
        options.attributes.draggable = true;
      }
    }
    return;
  }

  switch (role) {
    case 'default-header-fixed':
      defaultHeaderFixed = target.checked;
      return;
    case 'composite-type-selector':
      compositeBox.dataset.compositeType = target.value;
      renderCompositeZone();
      return;
    case 'parasite-selector':
      parasitized = target.checked;
      renderCompositeZone();
      return;
    case 'attribute-input':
      updateAttribute(target);
      renderCompositeZone();
      return;
  }
}

function checkDroppable(target) {
  return target.dataset.role === 'placeholder';
}

function getValidIdAncestor(element) {
  const routes = [];
  let tempElement = element
  while (tempElement[SymbolId] === undefined) {
    routes.unshift('children', getElementIndex(tempElement));
    tempElement = tempElement.parentElement;
  }
  return {
    ancestor: tempElement,
    routes,
  };
}

// 渲染合成区
function renderCompositeZone(data = compositeData, options = {}) {
  const { type } = {
    type: compositeBox.dataset.compositeType,
    ...options,
  };

  if (type === 'editor' && parasitized) {
    const addLifecycle = (node) => {
      node.lifecycle = {
        created: (element, options) => {
          const { id } = options;

          // options里没有id属性的就不设置到CompositeMap
          if (id === undefined) return;

          element[SymbolId] = id;
          CompositeMap.set(id, { element, options });

          const { dataset: { headerFixed, dragMode } } = element;
          if (headerFixed === 'true') {
            element.querySelector(`#${id.slice(0, -8)}-header-fixed-checkbox`).checked = true;
          }

          if (dragMode) {
            element.querySelector(`#${id.slice(0, -8)}-drag-mode-selector`).value = dragMode;
          }
        },
      };
    };
  
    if (Array.isArray(data)) {
      data.forEach(c => traverse(c, addLifecycle));
      const children = data.map(createElement);
      compositeZone.replaceChildren(...children);
      return children;
    }
    
    traverse(data, addLifecycle);
    const child = createElement(data);
    compositeZone.replaceChildren(child);
    return child;
  }

  if (type === 'editor' && !parasitized) {
    const bone = getBone(clone(data));
    if (Array.isArray(bone)) {
      const children = bone.map(createElement);
      compositeZone.replaceChildren(...children);
      return children;
    }

    const child = createElement(bone);
    compositeZone.replaceChildren(child);
    return child;
  }

  if (type === 'json') {
    displayText = JSON.stringify(parasitized ? compositeData : getBone(clone(compositeData)), null, 4);
    const child = createElement({
      tag: 'div',
      text: displayText,
      attributes: {
        style: 'white-space: pre;'
      },
    });
    compositeZone.replaceChildren(child);
    return child;
  }

  if (type === 'template') {
    displayText = createElementString(parasitized ? compositeData : getBone(clone(compositeData)));
    const child = createElement({
      tag: 'div',
      text: displayText,
      attributes: {
        style: 'white-space: pre;'
      },
    });
    compositeZone.replaceChildren(child);
    return child;
  }

  return null;
}

function useNewId(options, wrapperId) {
  const { id } = options;
  if (/\-wrapper$/.test(id)) {
    const newId = uniqueId();
    const idRegexp = new RegExp(id.slice(0, -8), 'g');
    const { attributes, children: [ header, bone ] } = options;
    options.id = `${newId}-wrapper`;
    attributes['data-id'] = newId;
    attributes['id'] = `${newId}-wrapper`;
    header.attributes['data-id'] = newId;
    header.children.forEach(child => {
      Object.entries(child.attributes).forEach(([key, value]) => {
        if ((new RegExp(id.slice(0, -8), 'g')).test(value)) {
          child.attributes[key] = value.replaceAll(idRegexp, newId);
        }
      });
    });

    bone.id = newId;
    if (Array.isArray(bone.children)) {
      bone.children.forEach(child => {
        if (child.attributes['data-role'] === 'placeholder') {
          child.attributes['data-id'] = newId;
        } else {
          useNewId(child, newId);
        }
      });
    }
    return;
  }

  const newId = wrapperId || uniqueId();
  options.id = newId;
  if (Array.isArray(options.children)) {
    options.children.forEach(child => {
      if (child.attributes['data-role'] === 'placeholder') {
        child.attributes['data-id'] = newId;
      } else {
        useNewId(child, newId);
      }
    });
  }
}

// 将options进行包装
function getWrappedElement(elementOptions) {
  const { id, materialType, tag } = elementOptions;
  return {
    id: `${id}-wrapper`,
    tag: 'div',
    attributes: {
      'data-role': 'parasite',
      'data-parasite': 'wrapper',
      'data-header-fixed': defaultHeaderFixed,
      'data-id': id,
      'data-display': materialType,
      classes: 'composite-item-wrapper',
      id: `${id}-wrapper`,
    },
    children: [
      {
        tag: 'div',
        attributes: {
          'data-role': 'parasite',
          'data-id': id,
          classes: 'composite-item-header',
        },
        children: [
          {
            tag: 'input',
            attributes: {
              'data-role': 'parasite',
              'data-parasite': 'element-select-checkbox',
              'data-id': id,
              type: 'checkbox',
              id: `${id}-element-select-checkbox`,
            },
          },
          {
            tag: 'label',
            text: tag + '/' + id,
            attributes: {
              'data-role': 'parasite',
              for: `${id}-element-select-checkbox`,
            },
          },
          {
            tag: 'select',
            attributes: {
              'data-id': id,
              'data-role': 'parasite',
              'data-parasite': 'drag-mode-selector',
              id: `${id}-drag-mode-selector`,
            },
            children: [
              { tag: 'option', text: 'No Drag', attributes: { value: 'no-drag' } },
              { tag: 'option', text: 'Copy', attributes: { value: 'copy' } },
            ],
          },
          {
            tag: 'input',
            attributes: {
              id: `${id}-material-name`,
              type: 'text',
              placeholder: 'material name',
              style: 'margin-left: auto;',
            },
          },
          {
            tag: 'button',
            text: 'Save',
            attributes: {
              'data-role': 'parasite',
              'data-function-name': 'handleSaveAsMaterial',
              'data-id': id,
            },
          },
          {
            tag: 'input',
            attributes: {
              'data-role': 'parasite',
              'data-parasite': 'header-fixed-checkbox',
              'data-id': id,
              type: 'checkbox',
              id: `${id}-header-fixed-checkbox`,
            },
          },
          {
            tag: 'label',
            text: 'HeaderFixed',
            attributes: {
              'data-role': 'parasite',
              for: `${id}-header-fixed-checkbox`,
            },
          },
          {
            tag: 'button',
            text: 'Delete',
            attributes: {
              'data-role': 'parasite',
              'data-function-name': 'handleDelete',
              'data-id': id,
            },
          },
        ],
      },
      elementOptions,
    ],
  };
}

// 取得material渲染需要的options
function getMaterialOptions(params) {
  const { id, materialType } = params;
  switch (materialType) {
    case 'block':
      return {
        id,
        materialType,
        tag: 'div',
        children: [
          getPlaceholderOptions(id, 'block', 1),
          getPlaceholderOptions(id, 'block', -1),
        ],
      };
    case 'flex':
      return {
        id,
        materialType,
        tag: 'div',
        attributes: {
          style: `display: flex; flex-direction: row; flex-wrap: nowrap;`,
        },
        children: [
          getPlaceholderOptions(id, 'flex', 1),
          getPlaceholderOptions(id, 'flex', -1),
        ],
      };
    case 'grid':
      return {
        id,
        materialType,
        tag: 'div',
        attributes: {
          style: `display: grid; grid: 1fr 1fr/1fr 1fr;`,
        },
        children: [
          getPlaceholderOptions(id, 'grid', 0, 'inplace'),
          getPlaceholderOptions(id, 'grid', 1, 'inplace'),
          getPlaceholderOptions(id, 'grid', 2, 'inplace'),
          getPlaceholderOptions(id, 'grid', 3, 'inplace'),
        ],
      };
  }
  return params;
}

// 获取placeholder的options
function getPlaceholderOptions(id, materialType, place = 1, placeType = 'insert') {
  return {
    tag: 'div',
    text: 'placeholder',
    attributes: {
      'data-role': 'placeholder',
      'data-belong': materialType,
      'data-id': id,
      'data-place': place,
      'data-place-type': placeType,
      style: `width: 100%; height: 32px;`,
    },
  };
}

window.addEventListener('load', main);
